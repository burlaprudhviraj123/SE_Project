package com.grievance.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.grievance.dto.request.AcceptInviteRequest;
import com.grievance.dto.request.ForgotPasswordRequest;
import com.grievance.dto.request.LoginRequest;
import com.grievance.dto.request.RegisterRequest;
import com.grievance.dto.request.ResetPasswordRequest;
import com.grievance.dto.request.StaffInviteRequest;
import com.grievance.dto.request.VerifyOtpRequest;
import com.grievance.dto.response.AuthResponse;
import com.grievance.dto.response.UserResponse;
import com.grievance.entity.Department;
import com.grievance.entity.InviteToken;
import com.grievance.entity.OtpCode;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.exception.BadRequestException;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.exception.UnauthorizedException;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.InviteTokenRepository;
import com.grievance.repository.OtpCodeRepository;
import com.grievance.repository.UserRepository;
import com.grievance.security.JwtTokenProvider;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final OtpCodeRepository otpCodeRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final EmailService emailService;
    private final ModelMapper modelMapper;

    @Value("${app.auth.allowed-email-domains:anits.edu.in}")
    private String allowedEmailDomains;

    @Value("${jwt.expiration.time:86400000}")
    private long jwtExpirationMs;

    private final Map<String, List<Long>> rateLimitTracker = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    /**
     * Normalizes and validates whether an email belongs to configured allowed college domains.
     */
    public String validateAndNormalizeCollegeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        String email = rawEmail.trim().toLowerCase();
        List<String> domains = Arrays.stream(allowedEmailDomains.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(d -> !d.isEmpty())
                .toList();

        boolean allowed = domains.stream().anyMatch(domain -> email.endsWith("@" + domain));
        if (!allowed) {
            log.warn("Rejected registration attempt with disallowed email domain: {}", email);
            throw new AccessDeniedException("Registration is restricted to ANITS college email addresses.");
        }
        return email;
    }

    /**
     * In-memory sliding window rate limiter: maximum 5 requests per hour.
     */
    public synchronized void checkRateLimit(String key, String action) {
        long now = System.currentTimeMillis();
        long oneHourAgo = now - 3600000L;

        rateLimitTracker.compute(key, (k, timestamps) -> {
            if (timestamps == null) {
                return new java.util.ArrayList<>(List.of(now));
            }
            timestamps.removeIf(ts -> ts < oneHourAgo);
            if (timestamps.size() >= 5) {
                log.warn("Rate limit exceeded for key {} on action {}", key, action);
                throw new BadRequestException("Rate limit exceeded. Maximum 5 requests per hour allowed for this email or IP.");
            }
            timestamps.add(now);
            return timestamps;
        });
    }

    /**
     * 1a. Domain-gated registration (Students only).
     * Creates pending unverified account and sends a 6-digit OTP (10 min expiry).
     */
    public Map<String, String> registerStudent(RegisterRequest request, String clientIp) {
        String normalizedEmail = validateAndNormalizeCollegeEmail(request.getEmail());
        String username = request.getUsername().trim().toLowerCase();

        // Enforce rate limits by email and IP
        checkRateLimit("reg_email_" + normalizedEmail, "REGISTER");
        if (clientIp != null && !clientIp.isBlank()) {
            checkRateLimit("reg_ip_" + clientIp, "REGISTER");
        }

        // Check if an active verified user already exists
        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            if (Boolean.TRUE.equals(existing.getEmailVerified()) && Boolean.TRUE.equals(existing.getIsActive())) {
                throw new BadRequestException("An active account already exists with this email. Please log in.");
            }
        });

        if (userRepository.findByUsernameIgnoreCase(username).filter(u -> Boolean.TRUE.equals(u.getEmailVerified())).isPresent()) {
            throw new BadRequestException("Username already taken. Please choose another.");
        }

        // Upsert pending student account (ALWAYS ROLE_USER)
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElseGet(() ->
                User.builder().email(normalizedEmail).build()
        );

        user.setUsername(username);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhoneNumber());
        user.setAddress(request.getAddress());
        user.setRole(Role.USER); // Strict student role enforcement
        user.setIsActive(false);  // Inactive until OTP verification
        user.setEmailVerified(false);
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);

        userRepository.save(user);

        // Generate 6-digit OTP (10 min expiry)
        String otpCode = String.format("%06d", random.nextInt(1_000_000));
        OtpCode otp = OtpCode.builder()
                .email(normalizedEmail)
                .code(otpCode)
                .purpose("REGISTRATION")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();
        otpCodeRepository.save(otp);

        emailService.sendRegistrationOtpEmail(normalizedEmail, otpCode);

        log.info("Student registration initiated for {} (email: {}). OTP dispatched.", username, normalizedEmail);
        return Map.of(
                "message", "Registration OTP sent to your college email. Please verify within 10 minutes to activate your account.",
                "email", normalizedEmail
        );
    }

    /**
     * 1a. Verify OTP and activate student account.
     */
    public AuthResponse verifyRegistrationOtp(VerifyOtpRequest request, HttpServletResponse response) {
        String email = request.getEmail().trim().toLowerCase();
        String code = request.getOtpCode().trim();

        OtpCode otp = otpCodeRepository
                .findTopByEmailAndPurposeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, "REGISTRATION", LocalDateTime.now())
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP. Please request a new registration code."));

        if (!otp.getCode().equals(code)) {
            throw new BadRequestException("Invalid OTP code. Please check and try again.");
        }

        otp.setUsed(true);
        otpCodeRepository.save(otp);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        user.setEmailVerified(true);
        user.setIsActive(true);
        userRepository.save(user);

        emailService.sendWelcomeEmail(user.getEmail(), user.getFullName());

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new com.grievance.security.CustomUserDetails(user),
                null,
                new com.grievance.security.CustomUserDetails(user).getAuthorities()
        );
        String token = tokenProvider.generateToken(authentication);
        setAuthCookie(response, token);

        log.info("Student account successfully verified and activated: {}", email);
        return AuthResponse.builder()
                .message("Account verified and activated successfully")
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs)
                .user(convertToResponse(user))
                .build();
    }

    /**
     * 1c. Login with lockout after 5 failed attempts (15 min lock).
     */
    @Transactional(noRollbackFor = { BadCredentialsException.class })
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        String identifier = request.getUsername().trim().toLowerCase();
        log.info("Login attempt for identifier: {}", identifier);

        User user = userRepository.findByIdentifierIgnoreCase(identifier)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        // Check if soft-deleted/deactivated
        if (user.getDeactivatedAt() != null || Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Login rejected for deactivated user: {}", identifier);
            throw new UnauthorizedException("Your account is deactivated. Please contact campus administration.");
        }

        // Check account lockout
        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(LocalDateTime.now())) {
                log.warn("Login rejected for locked account: {} until {}", identifier, user.getLockedUntil());
                throw new UnauthorizedException("Account is temporarily locked due to multiple failed login attempts. Try again after " + user.getLockedUntil());
            } else {
                // Lock expired
                user.setLockedUntil(null);
                user.setFailedLoginCount(0);
                userRepository.saveAndFlush(user);
            }
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int newFailedCount = (user.getFailedLoginCount() != null ? user.getFailedLoginCount() : 0) + 1;
            user.setFailedLoginCount(newFailedCount);
            if (newFailedCount >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                log.warn("Account locked for 15 minutes due to 5 failed attempts: {}", identifier);
            }
            userRepository.saveAndFlush(user);
            throw new BadCredentialsException("Invalid username or password");
        }

        // Check email verification for students
        if (user.getRole() == Role.USER && Boolean.FALSE.equals(user.getEmailVerified())) {
            throw new UnauthorizedException("Your email address is not verified yet. Please complete OTP verification.");
        }

        // Success: reset lockout
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new com.grievance.security.CustomUserDetails(user),
                null,
                new com.grievance.security.CustomUserDetails(user).getAuthorities()
        );
        String token = tokenProvider.generateToken(authentication);
        setAuthCookie(response, token);

        log.info("User logged in successfully: {} (Role: {})", user.getUsername(), user.getRole());
        return AuthResponse.builder()
                .message("Login successful")
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs)
                .user(convertToResponse(user))
                .build();
    }

    /**
     * 1b. Admin invites staff member (Officer or Admin).
     */
    public Map<String, Object> inviteStaff(StaffInviteRequest request, Long adminUserId) {
        String email = validateAndNormalizeCollegeEmail(request.getEmail());

        if (request.getRole() != Role.OFFICER && request.getRole() != Role.ADMIN) {
            throw new BadRequestException("Staff invite role must be OFFICER or ADMIN");
        }

        Department department = null;
        if (request.getRole() == Role.OFFICER) {
            if (request.getDepartmentId() == null) {
                throw new BadRequestException("Department is required for Grievance Officers");
            }
            department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", request.getDepartmentId()));
        }

        if (userRepository.findByEmailIgnoreCase(email).filter(u -> Boolean.TRUE.equals(u.getIsActive())).isPresent()) {
            throw new BadRequestException("An active user with this email already exists");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        InviteToken invite = InviteToken.builder()
                .token(token)
                .email(email)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole())
                .department(department)
                .expiresAt(LocalDateTime.now().plusHours(48))
                .accepted(false)
                .build();
        inviteTokenRepository.save(invite);

        String inviteLink = "http://localhost:5173/accept-invite?token=" + token;
        emailService.sendStaffInviteEmail(email, inviteLink, request.getRole().toString(),
                department != null ? department.getName() : "System-wide");

        log.info("Staff invitation created by admin {} for email: {}, role: {}", adminUserId, email, request.getRole());
        return Map.of(
                "message", "Staff invitation created successfully. A 48-hour activation link has been dispatched.",
                "email", email,
                "role", request.getRole().toString(),
                "inviteToken", token
        );
    }

    /**
     * 1b. Accept staff invite and set initial password.
     */
    public AuthResponse acceptStaffInvite(AcceptInviteRequest request, HttpServletResponse response) {
        InviteToken invite = inviteTokenRepository
                .findByTokenAndAcceptedFalseAndExpiresAtAfter(request.getToken(), LocalDateTime.now())
                .orElseThrow(() -> new BadRequestException("Invalid or expired staff invitation link."));

        String username = invite.getEmail().split("@")[0].toLowerCase();
        // Disambiguate username if already taken
        if (userRepository.existsByUsername(username)) {
            username = username + "_" + random.nextInt(1000);
        }

        User user = userRepository.findByEmailIgnoreCase(invite.getEmail()).orElseGet(() ->
                User.builder().email(invite.getEmail()).build()
        );

        user.setUsername(username);
        user.setEmail(invite.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(invite.getFirstName());
        user.setLastName(invite.getLastName());
        user.setRole(invite.getRole());
        user.setDepartment(invite.getDepartment());
        user.setIsActive(true);
        user.setEmailVerified(true);
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);

        User savedUser = userRepository.save(user);

        invite.setAccepted(true);
        inviteTokenRepository.save(invite);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new com.grievance.security.CustomUserDetails(savedUser),
                null,
                new com.grievance.security.CustomUserDetails(savedUser).getAuthorities()
        );
        String token = tokenProvider.generateToken(authentication);
        setAuthCookie(response, token);

        log.info("Staff member accepted invitation and activated account: {} ({})", savedUser.getEmail(), savedUser.getRole());
        return AuthResponse.builder()
                .message("Staff account setup complete")
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs)
                .user(convertToResponse(savedUser))
                .build();
    }

    /**
     * 1c. Forgot Password OTP generation.
     */
    public Map<String, String> forgotPassword(ForgotPasswordRequest request, String clientIp) {
        String email = validateAndNormalizeCollegeEmail(request.getEmail());
        checkRateLimit("pwd_email_" + email, "FORGOT_PASSWORD");

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadRequestException("No registered account found with this college email"));

        if (!user.getIsActive() || user.getDeactivatedAt() != null) {
            throw new BadRequestException("This account is inactive or deactivated");
        }

        String otpCode = String.format("%06d", random.nextInt(1_000_000));
        OtpCode otp = OtpCode.builder()
                .email(email)
                .code(otpCode)
                .purpose("PASSWORD_RESET")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();
        otpCodeRepository.save(otp);

        emailService.sendPasswordResetOtpEmail(email, otpCode);
        return Map.of("message", "Password reset OTP sent to your college email. Valid for 10 minutes.");
    }

    /**
     * 1c. Reset Password with OTP verification.
     */
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String code = request.getOtpCode().trim();

        OtpCode otp = otpCodeRepository
                .findTopByEmailAndPurposeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(email, "PASSWORD_RESET", LocalDateTime.now())
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset OTP."));

        if (!otp.getCode().equals(code)) {
            throw new BadRequestException("Invalid OTP code.");
        }

        otp.setUsed(true);
        otpCodeRepository.save(otp);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        log.info("Password successfully reset for user: {}", email);
        return Map.of("message", "Password has been successfully updated. You may now log in.");
    }

    /**
     * Sets an HttpOnly JWT cookie on the response for XSS protection.
     */
    public void setAuthCookie(HttpServletResponse response, String token) {
        if (response != null && token != null) {
            ResponseCookie cookie = ResponseCookie.from("jwt", token)
                    .httpOnly(true)
                    .secure(false) // Set to true in HTTPS production
                    .path("/")
                    .maxAge(jwtExpirationMs / 1000)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    /**
     * Clears the HttpOnly JWT cookie.
     */
    public void clearAuthCookie(HttpServletResponse response) {
        if (response != null) {
            ResponseCookie cookie = ResponseCookie.from("jwt", "")
                    .httpOnly(true)
                    .secure(false)
                    .path("/")
                    .maxAge(0)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    private UserResponse convertToResponse(User user) {
        UserResponse response = modelMapper.map(user, UserResponse.class);
        response.setFullName(user.getFullName());
        if (user.getDepartment() != null) {
            response.setDepartmentId(user.getDepartment().getId());
            response.setDepartmentName(user.getDepartment().getName());
        }
        return response;
    }
}
