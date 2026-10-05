-- ============================================================
-- V1: Initial PostgreSQL Schema for ANITS Campus Grievance System
-- ============================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    contact_email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (with domain gating, lock, and soft delete fields)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at TIMESTAMP,
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- 3. OTP Codes Table (for email domain verification & password reset)
CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_codes(email, purpose);

-- 4. Staff Invite Tokens Table (for Officer / Admin secure onboarding)
CREATE TABLE IF NOT EXISTS invite_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invite_token ON invite_tokens(token);

-- 5. Grievances Table
CREATE TABLE IF NOT EXISTS grievances (
    id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    grievance_number VARCHAR(20) NOT NULL UNIQUE,
    citizen_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_officer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    public_id VARCHAR(36) UNIQUE,
    public_title VARCHAR(200),
    public_summary VARCHAR(2000),
    attachment_url VARCHAR(500),
    status VARCHAR(100) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    resolution_days INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grievances_citizen ON grievances(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grievances_officer ON grievances(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_grievances_department ON grievances(department_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_public_id ON grievances(public_id);

-- 6. Grievance History / Audit Table
CREATE TABLE IF NOT EXISTS grievance_history (
    id BIGSERIAL PRIMARY KEY,
    grievance_id BIGINT NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
    old_status VARCHAR(100),
    new_status VARCHAR(100) NOT NULL,
    remarks TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
    updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_grievance ON grievance_history(grievance_id);

-- 7. Grievance Upvotes Table
CREATE TABLE IF NOT EXISTS grievance_upvotes (
    id BIGSERIAL PRIMARY KEY,
    grievance_id BIGINT NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_grievance_user_upvote UNIQUE (grievance_id, user_id)
);

-- 8. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    grievance_id BIGINT NOT NULL UNIQUE REFERENCES grievances(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL,
    comments TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
