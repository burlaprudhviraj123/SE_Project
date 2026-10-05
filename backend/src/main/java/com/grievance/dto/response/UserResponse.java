package com.grievance.dto.response;

import com.grievance.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * DTO for user response (never expose entity directly).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String address;
    private Role role;
    private Long departmentId;
    private String departmentName;
    private String fullName;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getFullName() {
        if (fullName != null && !fullName.isBlank()) {
            return fullName;
        }
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
