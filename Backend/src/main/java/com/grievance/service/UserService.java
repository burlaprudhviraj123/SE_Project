package com.grievance.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.grievance.dto.request.ChangePasswordRequest;
import com.grievance.dto.request.ProfileUpdateRequest;
import com.grievance.dto.request.RegisterRequest;
import com.grievance.dto.response.UserResponse;
import com.grievance.entity.Department;
import com.grievance.entity.Grievance;
import com.grievance.entity.GrievanceHistory;
import com.grievance.entity.User;
import com.grievance.enums.GrievanceStatus;
import com.grievance.enums.HistoryVisibility;
import com.grievance.enums.Role;
import com.grievance.exception.BadRequestException;
import com.grievance.exception.ResourceNotFoundException;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.GrievanceHistoryRepository;
import com.grievance.repository.GrievanceRepository;
import com.grievance.repository.UserRepository;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@AllArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final GrievanceRepository grievanceRepository;
    private final GrievanceHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;
    private final EmailService emailService;

    // ✅ REGISTER USER
    public UserResponse registerUser(RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already taken");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhoneNumber())
                .address(request.getAddress())
                .role(Role.USER)
                .isActive(true)
                .emailVerified(true)
                .failedLoginCount(0)
                .build();

        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getFullName());
        return convertToResponse(savedUser);
    }

    // ✅ GET USER PROFILE
    @Transactional(readOnly = true)
    public UserResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return convertToResponse(user);
    }

    // ✅ UPDATE USER PROFILE
    public UserResponse updateUserProfile(Long userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) &&
                userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhoneNumber());
        user.setAddress(request.getAddress());

        log.info("Profile updated for user: {}", user.getUsername());
        return convertToResponse(userRepository.save(user));
    }

    // ✅ CHANGE PASSWORD
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid old password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for user: {}", user.getUsername());
    }

    // ✅ GET USER BY USERNAME
    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
        return convertToResponse(user);
    }

    // ✅ GET ALL USERS
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(this::convertToResponse);
    }

    // ✅ GET USERS BY ROLE
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ GET AVAILABLE OFFICERS
    @Transactional(readOnly = true)
    public List<UserResponse> getAvailableOfficers(Long departmentId) {
        return userRepository.findActiveOfficersByDepartment(departmentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ TOGGLE USER ACTIVE (SOFT DEACTIVATION & TICKET UNASSIGNMENT)
    public UserResponse toggleUserActive(Long userId, Boolean isActive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setIsActive(isActive);
        if (Boolean.FALSE.equals(isActive)) {
            user.setDeactivatedAt(LocalDateTime.now());
            returnOfficerTicketsToPool(user, "User account deactivated by administrator");
        } else {
            user.setDeactivatedAt(null);
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        }
        return convertToResponse(userRepository.save(user));
    }

    // ✅ ASSIGN DEPARTMENT (REASSSIGNMENT PROTECTION)
    public UserResponse assignDepartment(Long userId, Long departmentId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department", "id", departmentId));

        if (user.getDepartment() != null && !user.getDepartment().getId().equals(departmentId)) {
            returnOfficerTicketsToPool(user, "Officer reassigned from " + user.getDepartment().getName() + " to " + department.getName());
        }

        user.setDepartment(department);
        user.setRole(Role.OFFICER);

        return convertToResponse(userRepository.save(user));
    }

    // ✅ CHANGE USER ROLE
    public UserResponse changeUserRole(Long userId, Role role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.getRole() == Role.OFFICER && role != Role.OFFICER) {
            returnOfficerTicketsToPool(user, "Officer role changed to " + role);
        }

        user.setRole(role);
        return convertToResponse(userRepository.save(user));
    }

    // ✅ SOFT-DELETE USER
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        user.setIsActive(false);
        user.setDeactivatedAt(LocalDateTime.now());
        returnOfficerTicketsToPool(user, "Officer account deleted by administrator");
        userRepository.save(user);
        log.info("User {} soft-deleted (deactivatedAt set)", userId);
    }

    private void returnOfficerTicketsToPool(User officer, String reason) {
        List<Grievance> assignedGrievances = grievanceRepository.findByAssignedOfficerOrderByCreatedAtDesc(officer);
        for (Grievance grievance : assignedGrievances) {
            if (grievance.getStatus() == GrievanceStatus.ASSIGNED || grievance.getStatus() == GrievanceStatus.IN_PROGRESS) {
                GrievanceStatus oldStatus = grievance.getStatus();
                grievance.setAssignedOfficer(null);
                grievance.setStatus(GrievanceStatus.PENDING);
                grievanceRepository.save(grievance);

                GrievanceHistory history = GrievanceHistory.builder()
                        .grievance(grievance)
                        .oldStatus(oldStatus)
                        .newStatus(GrievanceStatus.PENDING)
                        .remarks(reason + ". Returned ticket to department pool.")
                        .visibility(HistoryVisibility.PARTICIPANTS)
                        .build();
                historyRepository.save(history);
                log.info("Grievance {} returned to department pool because officer {} was reassigned/deactivated",
                        grievance.getId(), officer.getId());
            }
        }
    }

    // ✅ CHECK USERNAME EXISTS
    @Transactional(readOnly = true)
    public boolean isUsernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    // ✅ CHECK EMAIL EXISTS
    @Transactional(readOnly = true)
    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    // ✅ COUNT USERS
    @Transactional(readOnly = true)
    public long countUsers() {
        return userRepository.count();
    }

    // ✅ CONVERT ENTITY → RESPONSE DTO
    private UserResponse convertToResponse(User user) {
        UserResponse response = modelMapper.map(user, UserResponse.class);

        if (user.getDepartment() != null) {
            response.setDepartmentName(user.getDepartment().getName());
            response.setDepartmentId(user.getDepartment().getId());
        }

        return response;
    }
}