package com.grievance.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.grievance.entity.Department;
import com.grievance.entity.User;
import com.grievance.enums.Role;
import com.grievance.repository.DepartmentRepository;
import com.grievance.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Automatically seeds default ADMIN, demo Department, and demo OFFICER on startup.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.core.env.Environment environment;
    
    @Value("${demo.admin.password:admin1234}")
    private String adminPassword;
    @Value("${demo.officer.password:officer1234}")
    private String officerPassword;

    @Value("${app.initial-admin.email:${INITIAL_ADMIN_EMAIL:admin@anits.edu.in}}")
    private String initialAdminEmail;

    @Value("${app.initial-admin.name:${INITIAL_ADMIN_NAME:Campus Administrator}}")
    private String initialAdminName;

    @Override
    public void run(String... args) {
        // --- 1. Primary Campus Admin Account (username: admin) ---
        userRepository.findByUsername("admin").ifPresentOrElse(
            user -> {
                user.setRole(Role.ADMIN);
                user.setIsActive(true);
                user.setEmailVerified(true);
                user.setDeactivatedAt(null);
                user.setLockedUntil(null);
                user.setFailedLoginCount(0);
                user.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(user);
                log.info("Synchronized primary admin account (username: admin, password: {})", adminPassword);
            },
            () -> {
                User initialAdmin = User.builder()
                        .username("admin")
                        .email("admin@anits.edu.in")
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .firstName("Campus")
                        .lastName("Administrator")
                        .role(Role.ADMIN)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(initialAdmin);
                log.info("Initialized primary admin account: admin (admin@anits.edu.in)");
            }
        );

        // --- College Campus Departments ---

        Department hostelDept = departmentRepository.findByName("Hostel & Accommodation").orElseGet(() -> {
            Department dept = Department.builder()
                    .name("Hostel & Accommodation")
                    .description("Handles hostel room issues, maintenance, and accommodation-related complaints")
                    .contactEmail("hostel@college-grievance.com")
                    .isActive(true)
                    .build();
            Department saved = departmentRepository.save(dept);
            log.info("Created Hostel & Accommodation department.");
            return saved;
        });

        Department academicsDept = departmentRepository.findByName("Academics & Examinations").orElseGet(() -> {
            Department dept = Department.builder()
                    .name("Academics & Examinations")
                    .description("Handles academic issues, grade discrepancies, and examination-related complaints")
                    .contactEmail("academics@college-grievance.com")
                    .isActive(true)
                    .build();
            Department saved = departmentRepository.save(dept);
            log.info("Created Academics & Examinations department.");
            return saved;
        });

        Department itDept = departmentRepository.findByName("IT & Infrastructure").orElseGet(() -> {
            Department dept = Department.builder()
                    .name("IT & Infrastructure")
                    .description("Handles wifi, lab computers, classroom AV, and campus infrastructure issues")
                    .contactEmail("it-infra@college-grievance.com")
                    .isActive(true)
                    .build();
            Department saved = departmentRepository.save(dept);
            log.info("Created IT & Infrastructure department.");
            return saved;
        });

        Department canteenDept = departmentRepository.findByName("Canteen & Mess").orElseGet(() -> {
            Department dept = Department.builder()
                    .name("Canteen & Mess")
                    .description("Handles food quality, hygiene, and canteen/mess service complaints")
                    .contactEmail("canteen@college-grievance.com")
                    .isActive(true)
                    .build();
            Department saved = departmentRepository.save(dept);
            log.info("Created Canteen & Mess department.");
            return saved;
        });

        Department adminDept = departmentRepository.findByName("Administration").orElseGet(() -> {
            Department dept = Department.builder()
                    .name("Administration")
                    .description("Handles ID cards, certificates, fee receipts, and general administrative complaints")
                    .contactEmail("admin-office@college-grievance.com")
                    .isActive(true)
                    .build();
            Department saved = departmentRepository.save(dept);
            log.info("Created Administration department.");
            return saved;
        });

        // Demo accounts only seeded in dev profile (or default local dev)
        if (environment.matchesProfiles("dev") || environment.getActiveProfiles().length == 0) {
            log.info("Dev profile active: seeding demo staff accounts");
            // Ensure admin12 exists
            userRepository.findByUsername("admin12").ifPresentOrElse(
                user -> {
                    user.setRole(Role.ADMIN);
                    user.setIsActive(true);
                    user.setEmailVerified(true);
                    user.setDeactivatedAt(null);
                    user.setLockedUntil(null);
                    user.setFailedLoginCount(0);
                    user.setPasswordHash(passwordEncoder.encode(adminPassword));
                    userRepository.save(user);
                    log.info("Synchronized admin12 account (username: admin12, password: {})", adminPassword);
                },
            () -> {
                User newAdmin12 = User.builder()
                        .username("admin12")
                        .email("admin12@grievance.com")
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .firstName("Admin")
                        .lastName("12")
                        .phone("9999999998")
                        .role(Role.ADMIN)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newAdmin12);
                log.info("Created admin12 account (username: admin12)");
            }
        );

        // Ensure demo officers exist (one per department)
        userRepository.findByUsername("officer1").ifPresentOrElse(
            officer -> {
                officer.setRole(Role.OFFICER);
                officer.setIsActive(true);
                officer.setEmailVerified(true);
                officer.setDeactivatedAt(null);
                officer.setLockedUntil(null);
                officer.setFailedLoginCount(0);
                officer.setDepartment(hostelDept);
                officer.setPasswordHash(passwordEncoder.encode(officerPassword));
                userRepository.save(officer);
                log.info("Synchronized officer1 account assigned to {}", hostelDept.getName());
            },
            () -> {
                User newOfficer = User.builder()
                        .username("officer1")
                        .email("officer1@grievance.com")
                        .passwordHash(passwordEncoder.encode(officerPassword))
                        .firstName("Hostel")
                        .lastName("Warden")
                        .phone("9876543210")
                        .role(Role.OFFICER)
                        .department(hostelDept)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newOfficer);
                log.info("Created officer1 account for {}", hostelDept.getName());
            }
        );

        userRepository.findByUsername("officer2").ifPresentOrElse(
            officer -> {
                officer.setRole(Role.OFFICER);
                officer.setIsActive(true);
                officer.setEmailVerified(true);
                officer.setDeactivatedAt(null);
                officer.setLockedUntil(null);
                officer.setFailedLoginCount(0);
                officer.setDepartment(academicsDept);
                officer.setPasswordHash(passwordEncoder.encode(officerPassword));
                userRepository.save(officer);
                log.info("Synchronized officer2 account assigned to {}", academicsDept.getName());
            },
            () -> {
                User newOfficer = User.builder()
                        .username("officer2")
                        .email("officer2@grievance.com")
                        .passwordHash(passwordEncoder.encode(officerPassword))
                        .firstName("Exam")
                        .lastName("Cell")
                        .phone("9876543211")
                        .role(Role.OFFICER)
                        .department(academicsDept)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newOfficer);
                log.info("Created officer2 account for {}", academicsDept.getName());
            }
        );

        userRepository.findByUsername("officer3").ifPresentOrElse(
            officer -> {
                officer.setRole(Role.OFFICER);
                officer.setIsActive(true);
                officer.setEmailVerified(true);
                officer.setDeactivatedAt(null);
                officer.setLockedUntil(null);
                officer.setFailedLoginCount(0);
                officer.setDepartment(itDept);
                officer.setPasswordHash(passwordEncoder.encode(officerPassword));
                userRepository.save(officer);
                log.info("Synchronized officer3 account assigned to {}", itDept.getName());
            },
            () -> {
                User newOfficer = User.builder()
                        .username("officer3")
                        .email("officer3@grievance.com")
                        .passwordHash(passwordEncoder.encode(officerPassword))
                        .firstName("IT")
                        .lastName("Support")
                        .phone("9876543212")
                        .role(Role.OFFICER)
                        .department(itDept)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newOfficer);
                log.info("Created officer3 account for {}", itDept.getName());
            }
        );

        userRepository.findByUsername("officer4").ifPresentOrElse(
            officer -> {
                officer.setRole(Role.OFFICER);
                officer.setIsActive(true);
                officer.setEmailVerified(true);
                officer.setDeactivatedAt(null);
                officer.setLockedUntil(null);
                officer.setFailedLoginCount(0);
                officer.setDepartment(canteenDept);
                officer.setPasswordHash(passwordEncoder.encode(officerPassword));
                userRepository.save(officer);
                log.info("Synchronized officer4 account assigned to {}", canteenDept.getName());
            },
            () -> {
                User newOfficer = User.builder()
                        .username("officer4")
                        .email("officer4@grievance.com")
                        .passwordHash(passwordEncoder.encode(officerPassword))
                        .firstName("Mess")
                        .lastName("Supervisor")
                        .phone("9876543213")
                        .role(Role.OFFICER)
                        .department(canteenDept)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newOfficer);
                log.info("Created officer4 account for {}", canteenDept.getName());
            }
        );

        userRepository.findByUsername("officer5").ifPresentOrElse(
            officer -> {
                officer.setRole(Role.OFFICER);
                officer.setIsActive(true);
                officer.setEmailVerified(true);
                officer.setDeactivatedAt(null);
                officer.setLockedUntil(null);
                officer.setFailedLoginCount(0);
                officer.setDepartment(adminDept);
                officer.setPasswordHash(passwordEncoder.encode(officerPassword));
                userRepository.save(officer);
                log.info("Synchronized officer5 account assigned to {}", adminDept.getName());
            },
            () -> {
                User newOfficer = User.builder()
                        .username("officer5")
                        .email("officer5@grievance.com")
                        .passwordHash(passwordEncoder.encode(officerPassword))
                        .firstName("Admin")
                        .lastName("Office")
                        .phone("9876543214")
                        .role(Role.OFFICER)
                        .department(adminDept)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newOfficer);
                log.info("Created officer5 account for {}", adminDept.getName());
            }
        );

        // Ensure demo student account exists
        userRepository.findByUsername("student1").ifPresentOrElse(
            student -> {
                student.setRole(Role.USER);
                student.setIsActive(true);
                student.setEmailVerified(true);
                student.setDeactivatedAt(null);
                student.setLockedUntil(null);
                student.setFailedLoginCount(0);
                student.setPasswordHash(passwordEncoder.encode(adminPassword));
                userRepository.save(student);
                log.info("Synchronized student1 account");
            },
            () -> {
                User newStudent = User.builder()
                        .username("student1")
                        .email("student1@anits.edu.in")
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .firstName("John")
                        .lastName("Doe")
                        .phone("9876543219")
                        .role(Role.USER)
                        .isActive(true)
                        .emailVerified(true)
                        .failedLoginCount(0)
                        .build();
                userRepository.save(newStudent);
                log.info("Created student1 account");
            }
        );
        }
    }
}
