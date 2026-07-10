-- Migration 014: PPDB MPLS & Academic Calendar Tables
-- mpls_schedules, applicant_mpls, academic_calendars

-- ============================================================
-- 1. Jadwal MPLS
-- ============================================================
CREATE TABLE IF NOT EXISTS mpls_schedules (
    id VARCHAR(36) NOT NULL,
    period_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_mpls_schedules_period (period_id),
    CONSTRAINT fk_mpls_schedules_period FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_mpls_schedules_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Kehadiran MPLS per Pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_mpls (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'registered' COMMENT 'registered,present,absent',
    attended_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_mpls (applicant_id, schedule_id),
    CONSTRAINT fk_app_mpls_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_mpls_schedule FOREIGN KEY (schedule_id) REFERENCES mpls_schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Kalender Akademik
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_calendars (
    id VARCHAR(36) NOT NULL,
    period_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL COMMENT 'holiday,exam,event,meeting,deadline',
    is_public TINYINT(1) DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_academic_calendars_period (period_id),
    KEY idx_academic_calendars_date (event_date),
    CONSTRAINT fk_academic_calendars_period FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_calendars_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
