-- Migration 015: PPDB Notification & Dashboard Tables
-- notification_templates, notifications, dashboard_statistics

-- ============================================================
-- 1. Template Notifikasi
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_template TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'in_app' COMMENT 'in_app,email,whatsapp,sms',
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_notif_templates_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Notifikasi per User
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'in_app' COMMENT 'in_app,email,whatsapp,sms',
    is_read TINYINT(1) DEFAULT 0,
    read_at DATETIME(3) NULL,
    data JSON NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notifications_user (user_id),
    KEY idx_notifications_read (user_id, is_read),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_template FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Statistik Dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_statistics (
    id VARCHAR(36) NOT NULL,
    period_id VARCHAR(36) NOT NULL,
    stat_type VARCHAR(50) NOT NULL,
    stat_key VARCHAR(100) NOT NULL,
    stat_value DECIMAL(15,2) NOT NULL,
    metadata JSON NULL,
    calculated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_dashboard_stat (period_id, stat_type, stat_key),
    CONSTRAINT fk_dashboard_stat_period FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
