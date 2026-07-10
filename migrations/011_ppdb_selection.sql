-- Migration 011: PPDB Selection / Testing Tables
-- test_types, test_parameters, test_sessions, applicant_test_sessions,
-- applicant_test_results, applicant_test_scores, graduation_rules, applicant_graduations

-- ============================================================
-- 1. Jenis Tes
-- ============================================================
CREATE TABLE IF NOT EXISTS test_types (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_test_types_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Parameter Tes (Sub-komponen penilaian per jenis tes)
-- ============================================================
CREATE TABLE IF NOT EXISTS test_parameters (
    id VARCHAR(36) NOT NULL,
    test_type_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.0,
    min_score DECIMAL(5,2) DEFAULT 0,
    max_score DECIMAL(5,2) DEFAULT 100,
    passing_score DECIMAL(5,2) NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_test_params_type FOREIGN KEY (test_type_id) REFERENCES test_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Sesi Tes
-- ============================================================
CREATE TABLE IF NOT EXISTS test_sessions (
    id VARCHAR(36) NOT NULL,
    wave_config_id VARCHAR(36) NOT NULL,
    test_type_id VARCHAR(36) NOT NULL,
    session_name VARCHAR(200) NOT NULL,
    test_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NULL,
    capacity INT NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' COMMENT 'scheduled,ongoing,completed,cancelled',
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_test_sessions_date (test_date),
    KEY idx_test_sessions_status (status),
    CONSTRAINT fk_test_sessions_wave_config FOREIGN KEY (wave_config_id) REFERENCES wave_configurations(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_sessions_type FOREIGN KEY (test_type_id) REFERENCES test_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_test_sessions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Pendaftar → Sesi Tes (Many-to-Many)
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_test_sessions (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    test_session_id VARCHAR(36) NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'registered' COMMENT 'registered,present,absent',
    attended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_session (applicant_id, test_session_id),
    CONSTRAINT fk_app_test_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_test_session FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Hasil Tes per Pendaftar per Jenis Tes
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_test_results (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    test_type_id VARCHAR(36) NOT NULL,
    total_score DECIMAL(8,2) NULL,
    is_passed TINYINT(1) NULL,
    notes TEXT NULL,
    graded_by VARCHAR(36) NULL,
    graded_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_test_type (applicant_id, test_type_id),
    CONSTRAINT fk_test_result_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_result_type FOREIGN KEY (test_type_id) REFERENCES test_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_test_result_grader FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Skor per Parameter (Detail per komponen tes)
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_test_scores (
    id VARCHAR(36) NOT NULL,
    result_id VARCHAR(36) NOT NULL,
    parameter_id VARCHAR(36) NOT NULL,
    score DECIMAL(8,2) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_result_param (result_id, parameter_id),
    CONSTRAINT fk_test_scores_result FOREIGN KEY (result_id) REFERENCES applicant_test_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_scores_param FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Aturan Kelulusan
-- ============================================================
CREATE TABLE IF NOT EXISTS graduation_rules (
    id VARCHAR(36) NOT NULL,
    wave_config_id VARCHAR(36) NOT NULL,
    rule_type VARCHAR(20) NOT NULL COMMENT 'score_based,ranking_based,manual',
    min_total_score DECIMAL(8,2) NULL,
    must_pass_all_tests TINYINT(1) DEFAULT 0,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_grad_rules_wave_config FOREIGN KEY (wave_config_id) REFERENCES wave_configurations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Kelulusan Pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_graduations (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    is_graduated TINYINT(1) NOT NULL,
    graduation_rank INT NULL,
    total_score DECIMAL(8,2) NULL,
    decided_by VARCHAR(36) NULL,
    decided_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_graduation (applicant_id),
    CONSTRAINT fk_app_grad_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_grad_decided_by FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
