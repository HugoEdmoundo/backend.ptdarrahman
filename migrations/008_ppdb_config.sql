-- Migration 008: PPDB Configuration Tables
-- education_levels, registration_categories, ppdb_periods, ppdb_waves,
-- selection_flows, selection_flow_steps, wave_configurations

-- ============================================================
-- 1. Jenjang Pendidikan
-- ============================================================
CREATE TABLE IF NOT EXISTS education_levels (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_education_levels_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Kategori Pendaftaran
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_categories (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_registration_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Periode PPDB
-- ============================================================
CREATE TABLE IF NOT EXISTS ppdb_periods (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    academic_year VARCHAR(20) NOT NULL COMMENT 'e.g. 2026/2027',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' COMMENT 'draft,active,closed,archived',
    description TEXT NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ppdb_periods_status (status),
    CONSTRAINT fk_ppdb_periods_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Gelombang Pendaftaran
-- ============================================================
CREATE TABLE IF NOT EXISTS ppdb_waves (
    id VARCHAR(36) NOT NULL,
    period_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    wave_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    quota INT NOT NULL,
    waiting_list_enabled TINYINT(1) DEFAULT 0,
    auto_move_next_wave TINYINT(1) DEFAULT 0,
    discount_type VARCHAR(20) NULL COMMENT 'percentage,fixed',
    discount_value DECIMAL(15,2) NULL,
    status VARCHAR(20) DEFAULT 'draft' COMMENT 'draft,open,closed',
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ppdb_waves_period_number (period_id, wave_number),
    KEY idx_ppdb_waves_status (status),
    CONSTRAINT fk_ppdb_waves_period FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_ppdb_waves_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Alur Seleksi
-- ============================================================
CREATE TABLE IF NOT EXISTS selection_flows (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_selection_flows_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Langkah Alur Seleksi
-- ============================================================
CREATE TABLE IF NOT EXISTS selection_flow_steps (
    id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36) NOT NULL,
    sequence INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    step_type VARCHAR(20) NOT NULL COMMENT 'payment,document,test,mou,announcement',
    is_required TINYINT(1) DEFAULT 1,
    config JSON NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_flow_steps_sequence (flow_id, sequence),
    UNIQUE KEY uk_flow_steps_code (flow_id, code),
    CONSTRAINT fk_flow_steps_flow FOREIGN KEY (flow_id) REFERENCES selection_flows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Konfigurasi Gelombang (Wave Configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS wave_configurations (
    id VARCHAR(36) NOT NULL,
    wave_id VARCHAR(36) NOT NULL,
    level_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36) NOT NULL,
    payment_stage_count INT DEFAULT 1,
    quota INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_wave_config (wave_id, level_id, category_id),
    CONSTRAINT fk_wave_config_wave FOREIGN KEY (wave_id) REFERENCES ppdb_waves(id) ON DELETE CASCADE,
    CONSTRAINT fk_wave_config_level FOREIGN KEY (level_id) REFERENCES education_levels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wave_config_category FOREIGN KEY (category_id) REFERENCES registration_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_wave_config_flow FOREIGN KEY (flow_id) REFERENCES selection_flows(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
