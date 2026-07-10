-- Migration 009: PPDB Applicant Tables
-- applicants, applicant_profiles, applicant_parents, applicant_status_histories

-- ============================================================
-- 1. Pendaftar (Applicants)
-- ============================================================
CREATE TABLE IF NOT EXISTS applicants (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    wave_config_id VARCHAR(36) NOT NULL,
    registration_number VARCHAR(30) NOT NULL COMMENT 'e.g. PPDB-2026-00001',
    current_status VARCHAR(20) DEFAULT 'registered' COMMENT 'registered,payment_pending,document_pending,testing,graduated,accepted,rejected,waiting_list',
    registered_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicants_user (user_id),
    UNIQUE KEY uk_applicants_reg_number (registration_number),
    KEY idx_applicants_status (current_status),
    KEY idx_applicants_wave_config (wave_config_id),
    CONSTRAINT fk_applicants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_applicants_wave_config FOREIGN KEY (wave_config_id) REFERENCES wave_configurations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Profil Detail Pendaftar (1:1 dengan applicants)
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_profiles (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NULL,
    gender VARCHAR(10) NOT NULL COMMENT 'male,female',
    birth_place VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    religion VARCHAR(50) DEFAULT 'Islam',
    nationality VARCHAR(50) DEFAULT 'Indonesia',
    nik VARCHAR(16) NULL,
    nisn VARCHAR(20) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    address TEXT NOT NULL,
    province VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    village VARCHAR(100) NULL,
    postal_code VARCHAR(10) NULL,
    previous_school VARCHAR(255) NULL,
    photo_url VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_profiles (applicant_id),
    CONSTRAINT fk_applicant_profiles_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Orang Tua / Wali
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_parents (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    parent_type VARCHAR(10) NOT NULL COMMENT 'father,mother,guardian',
    full_name VARCHAR(255) NOT NULL,
    nik VARCHAR(16) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    occupation VARCHAR(100) NULL,
    income VARCHAR(50) NULL,
    education VARCHAR(50) NULL,
    address TEXT NULL,
    is_same_address TINYINT(1) DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_parent (applicant_id, parent_type),
    CONSTRAINT fk_applicant_parents_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Riwayat Status Pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_status_histories (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    old_status VARCHAR(20) NULL COMMENT 'registered,payment_pending,document_pending,testing,graduated,accepted,rejected,waiting_list',
    new_status VARCHAR(20) NOT NULL COMMENT 'registered,payment_pending,document_pending,testing,graduated,accepted,rejected,waiting_list',
    changed_by VARCHAR(36) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_status_hist_applicant (applicant_id),
    CONSTRAINT fk_status_hist_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_status_hist_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
