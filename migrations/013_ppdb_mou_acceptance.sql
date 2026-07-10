-- Migration 013: PPDB MOU & Acceptance Tables
-- mou_templates, applicant_mous, acceptance_letters, re_registrations

-- ============================================================
-- 1. Template MOU
-- ============================================================
CREATE TABLE IF NOT EXISTS mou_templates (
    id VARCHAR(36) NOT NULL,
    level_id VARCHAR(36) NULL COMMENT 'NULL = berlaku untuk semua jenjang',
    name VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    is_active TINYINT(1) DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_mou_templates_level FOREIGN KEY (level_id) REFERENCES education_levels(id) ON DELETE SET NULL,
    CONSTRAINT fk_mou_templates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MOU Pendaftar (per Applicant)
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_mous (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    signed_at DATETIME(3) NULL,
    signature_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending,signed,rejected',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_app_mou_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_mou_template FOREIGN KEY (template_id) REFERENCES mou_templates(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Surat Penerimaan (Acceptance Letters)
-- ============================================================
CREATE TABLE IF NOT EXISTS acceptance_letters (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    letter_number VARCHAR(50) NOT NULL,
    issued_date DATE NOT NULL,
    content TEXT NULL,
    pdf_url VARCHAR(500) NULL,
    issued_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_acceptance_letters_applicant (applicant_id),
    UNIQUE KEY uk_acceptance_letters_number (letter_number),
    CONSTRAINT fk_acceptance_letters_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_acceptance_letters_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Registrasi Ulang (Re-registration)
-- ============================================================
CREATE TABLE IF NOT EXISTS re_registrations (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    deadline DATE NOT NULL,
    completed_at DATETIME(3) NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending,completed,expired',
    verified_by VARCHAR(36) NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_re_registrations_applicant (applicant_id),
    CONSTRAINT fk_re_registrations_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_re_registrations_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
