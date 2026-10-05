package com.grievance.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.grievance.dto.request.LoginRequest;
import com.grievance.dto.request.RegisterRequest;
import com.grievance.dto.request.VerifyOtpRequest;
import com.grievance.dto.response.AuthResponse;
import com.grievance.entity.OtpCode;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.exception.UnauthorizedException;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.InviteTokenRepository;
import com.grievance.repository.OtpCodeRepository;
import com.grievance.repository.UserRepository;
import com.grievance.security.JwtTokenProvider;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private OtpCodeRepository otpCodeRepository;
    @Mock
    private InviteTokenRepository inviteTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private EmailService emailService;

    private ModelMapper modelMapper = new ModelMapper();
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                departmentRepository,
                otpCodeRepository,
                inviteTokenRepository,
                passwordEncoder,
                authenticationManager,
                tokenProvider,
                emailService,
                modelMapper
        );
        ReflectionTestUtils.setField(authService, "allowedEmailDomains", "anits.edu.in");
        ReflectionTestUtils.setField(authService, "jwtExpirationMs", 86400000L);
    }

    @Test
    @DisplayName("Reject registration if email domain is not @anits.edu.in")
    void testRegistrationRejectsNonCollegeDomain() {
        RegisterRequest req = RegisterRequest.builder()
                .username("john_doe")
                .email("john@gmail.com")
                .password("Password123!")
                .firstName("John")
                .lastName("Doe")
                .build();

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                authService.registerStudent(req, "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("Registration is restricted to ANITS college email addresses"));
    }

    @Test
    @DisplayName("Allow registration for valid @anits.edu.in email and enforce ROLE_USER unverified")
    void testRegistrationAllowsCollegeDomainAndEnforcesStudentRole() {
        RegisterRequest req = RegisterRequest.builder()
                .username("john_doe")
                .email("john.doe@anits.edu.in")
                .password("Password123!")
                .firstName("John")
                .lastName("Doe")
                .phoneNumber("9876543210")
                .address("Visakhapatnam")
                .build();

        when(userRepository.findByEmailIgnoreCase("john.doe@anits.edu.in")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCase("john_doe")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed_pwd");

        authService.registerStudent(req, "127.0.0.1");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User saved = userCaptor.getValue();

        assertEquals("john.doe@anits.edu.in", saved.getEmail());
        assertEquals(Role.USER, saved.getRole(), "Must strictly enforce ROLE_USER for self-registration");
        assertFalse(saved.getIsActive(), "Account must be inactive pending OTP verification");
        assertFalse(saved.getEmailVerified(), "Email must be unverified pending OTP verification");

        verify(emailService).sendRegistrationOtpEmail(any(), any());
    }

    @Test
    @DisplayName("Verify OTP activates student account and sets emailVerified=true")
    void testVerifyRegistrationOtpActivatesAccount() {
        String email = "john.doe@anits.edu.in";
        String code = "123456";

        OtpCode otp = OtpCode.builder()
                .email(email)
                .code(code)
                .purpose("REGISTRATION")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();

        User pendingUser = User.builder()
                .id(1L)
                .username("john_doe")
                .email(email)
                .firstName("John")
                .lastName("Doe")
                .role(Role.USER)
                .isActive(false)
                .emailVerified(false)
                .build();

        when(otpCodeRepository.findTopByEmailAndPurposeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(), any(), any()))
                .thenReturn(Optional.of(otp));
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(pendingUser));
        when(tokenProvider.generateToken(any())).thenReturn("mock_jwt_token");

        VerifyOtpRequest req = new VerifyOtpRequest(email, code);
        AuthResponse response = authService.verifyRegistrationOtp(req, null);

        assertNotNull(response);
        assertEquals("mock_jwt_token", response.getToken());
        assertTrue(pendingUser.getIsActive());
        assertTrue(pendingUser.getEmailVerified());
        assertTrue(otp.getUsed());
    }

    @Test
    @DisplayName("Lock account for 15 minutes after 5 failed login attempts")
    void testAccountLockoutAfterFiveFailedAttempts() {
        User user = User.builder()
                .id(1L)
                .username("student1")
                .email("student1@anits.edu.in")
                .passwordHash("hashed_pwd")
                .role(Role.USER)
                .isActive(true)
                .emailVerified(true)
                .failedLoginCount(4)
                .build();

        when(userRepository.findByIdentifierIgnoreCase("student1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "hashed_pwd")).thenReturn(false);

        LoginRequest loginReq = new LoginRequest("student1", "WrongPassword");

        assertThrows(BadCredentialsException.class, () ->
                authService.login(loginReq, null)
        );

        assertEquals(5, user.getFailedLoginCount());
        assertNotNull(user.getLockedUntil());
        assertTrue(user.getLockedUntil().isAfter(LocalDateTime.now()));
    }

    @Test
    @DisplayName("Reject login if user is soft-deleted / deactivated")
    void testDeactivatedUserLoginRejected() {
        User user = User.builder()
                .id(1L)
                .username("deactivated_user")
                .email("user@anits.edu.in")
                .passwordHash("hashed_pwd")
                .role(Role.USER)
                .isActive(false)
                .deactivatedAt(LocalDateTime.now().minusDays(1))
                .build();

        when(userRepository.findByIdentifierIgnoreCase("deactivated_user")).thenReturn(Optional.of(user));

        LoginRequest loginReq = new LoginRequest("deactivated_user", "password");

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () ->
                authService.login(loginReq, null)
        );

        assertTrue(ex.getMessage().contains("deactivated"));
    }
}
