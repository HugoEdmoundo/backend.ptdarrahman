-- MySQL Schema for Ptdarrahman
-- Jalankan di MySQL database: u868325204_ptdarrahman

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_superadmin TINYINT(1) DEFAULT 0,
    permissions JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    role_id VARCHAR(36),
    user_type VARCHAR(50) DEFAULT 'admin',
    is_active TINYINT(1) DEFAULT 1,
    profile JSON,
    full_name VARCHAR(255) DEFAULT '',
    avatar_url VARCHAR(255) DEFAULT '',
    last_login_at DATETIME(3),
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME(3),
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_role_id (role_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked TINYINT(1) DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_refresh_tokens_hash (token_hash(255)),
    KEY idx_refresh_tokens_user (user_id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    user_username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    changes JSON,
    ip_address TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_audit_log_entity (entity_type(255), entity_id(255)),
    KEY idx_audit_log_created (created_at),
    KEY idx_audit_log_user (user_id),
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    nisn VARCHAR(50),
    nis VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) DEFAULT 'L',
    birth_place VARCHAR(255) DEFAULT '',
    birth_date DATE,
    address TEXT,
    phone VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    father_name VARCHAR(255) DEFAULT '',
    mother_name VARCHAR(255) DEFAULT '',
    father_occupation VARCHAR(255) DEFAULT '',
    mother_occupation VARCHAR(255) DEFAULT '',
    parent_phone VARCHAR(50) DEFAULT '',
    photo VARCHAR(255) DEFAULT '',
    previous_school VARCHAR(255) DEFAULT '',
    registration_number VARCHAR(100) DEFAULT '',
    registration_date DATETIME(3),
    program VARCHAR(255) DEFAULT '',
    class_name VARCHAR(255) DEFAULT '',
    academic_year VARCHAR(20) DEFAULT '',
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_students_nisn (nisn),
    UNIQUE KEY uk_students_nis (nis),
    KEY idx_students_status (status),
    KEY idx_students_program (program),
    KEY idx_students_class (class_name),
    KEY idx_students_academic_year (academic_year),
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_articles (
    id VARCHAR(36) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    date VARCHAR(50),
    gallery JSON,
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_news_articles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(36) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    image VARCHAR(255),
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_programs_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(36) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(36) NOT NULL,
    image VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(36) NOT NULL,
    year INT NOT NULL,
    image VARCHAR(255),
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_items (
    id VARCHAR(36) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_links (
    id VARCHAR(36) NOT NULL,
    label VARCHAR(255) NOT NULL,
    href VARCHAR(255) NOT NULL,
    path VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    child VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    `order` INT NOT NULL DEFAULT 0,
    content JSON,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
    `key` VARCHAR(255) NOT NULL,
    value TEXT,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_info (
    id VARCHAR(36) NOT NULL,
    address TEXT,
    phone_primary VARCHAR(50),
    phone_secondary VARCHAR(50),
    whatsapp VARCHAR(50),
    email_primary VARCHAR(255),
    email_admission VARCHAR(255),
    office_hours VARCHAR(255),
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spp_settings (
    id VARCHAR(36) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    nominal BIGINT NOT NULL DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_spp_settings_class_year (class_name, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spp_bills (
    id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    bill_month INT NOT NULL,
    bill_year INT NOT NULL,
    nominal BIGINT NOT NULL DEFAULT 0,
    total_paid BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    due_date DATETIME(3),
    notes TEXT,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_spp_bills_student (student_id),
    KEY idx_spp_bills_month_year (bill_month, bill_year),
    KEY idx_spp_bills_status (status),
    CONSTRAINT fk_spp_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spp_payments (
    id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    bill_id VARCHAR(36),
    amount BIGINT NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    proof_type VARCHAR(50),
    proof_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    confirmed_by VARCHAR(36),
    confirmed_at DATETIME(3),
    notes TEXT,
    paid_by VARCHAR(36),
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_spp_payments_student (student_id),
    KEY idx_spp_payments_bill (bill_id),
    KEY idx_spp_payments_status (status),
    CONSTRAINT fk_spp_payments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_spp_payments_bill FOREIGN KEY (bill_id) REFERENCES spp_bills(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
