package com.grievance.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.grievance.dto.request.AcceptInviteRequest;
import com.grievance.dto.request.ForgotPasswordRequest;
import com.grievance.dto.request.LoginRequest;
import com.grievance.dto.request.RegisterRequest;
import com.grievance.dto.request.ResetPasswordRequest;
import com.grievance.dto.request.VerifyOtpRequest;
import com.grievance.dto.response.AuthResponse;
import com.grievance.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        log.info("Student registration request for username: {}, email: {}", request.getUsername(), request.getEmail());
        Map<String, String> response = authService.registerStudent(request, getClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request, HttpServletResponse response) {
        log.info("OTP verification request for email: {}", request.getEmail());
        AuthResponse authResponse = authService.verifyRegistrationOtp(request, response);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        log.info("User login request for username/email: {}", request.getUsername());
        AuthResponse authResponse = authService.login(request, response);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/accept-invite")
    public ResponseEntity<AuthResponse> acceptInvite(@Valid @RequestBody AcceptInviteRequest request, HttpServletResponse response) {
        log.info("Staff invite acceptance request");
        AuthResponse authResponse = authService.acceptStaffInvite(request, response);
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        log.info("Forgot password request for email: {}", request.getEmail());
        Map<String, String> response = authService.forgotPassword(request, getClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Password reset submission for email: {}", request.getEmail());
        Map<String, String> response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        log.info("User logout request");
        authService.clearAuthCookie(response);
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }
}
