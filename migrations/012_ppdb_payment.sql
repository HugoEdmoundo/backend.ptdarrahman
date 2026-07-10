-- Migration 012: PPDB Payment Tables
-- payment_stages, invoices, payment_transactions, installment_plans,
-- installment_schedules, discounts, applicant_discounts

-- ============================================================
-- 1. Tahapan Pembayaran
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_stages (
    id VARCHAR(36) NOT NULL,
    wave_config_id VARCHAR(36) NOT NULL,
    stage_number INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NULL,
    description TEXT NULL,
    is_installment_allowed TINYINT(1) DEFAULT 0,
    max_installments INT DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_stage (wave_config_id, stage_number),
    CONSTRAINT fk_payment_stages_wave_config FOREIGN KEY (wave_config_id) REFERENCES wave_configurations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Invoice
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    payment_stage_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' COMMENT 'unpaid,partial,paid,cancelled,overdue',
    due_date DATE NULL,
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_invoices_number (invoice_number),
    KEY idx_invoices_applicant (applicant_id),
    KEY idx_invoices_status (status),
    CONSTRAINT fk_invoices_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_payment_stage FOREIGN KEY (payment_stage_id) REFERENCES payment_stages(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Transaksi Pembayaran
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    transaction_number VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_proof_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending,verified,rejected,refunded',
    verified_by VARCHAR(36) NULL,
    verified_at DATETIME(3) NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_transactions_number (transaction_number),
    KEY idx_transactions_invoice (invoice_id),
    KEY idx_transactions_status (status),
    CONSTRAINT fk_transactions_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Rencana Cicilan
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_plans (
    id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    total_installments INT NOT NULL,
    approved_by VARCHAR(36) NULL,
    approved_at DATETIME(3) NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_installment_plan_invoice (invoice_id),
    CONSTRAINT fk_installment_plans_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_installment_plans_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Jadwal Cicilan
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_schedules (
    id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    installment_number INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' COMMENT 'unpaid,paid,overdue',
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_installment_schedule (plan_id, installment_number),
    CONSTRAINT fk_installment_schedules_plan FOREIGN KEY (plan_id) REFERENCES installment_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Diskon
-- ============================================================
CREATE TABLE IF NOT EXISTS discounts (
    id VARCHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    discount_type VARCHAR(20) NOT NULL COMMENT 'percentage,fixed',
    value DECIMAL(15,2) NOT NULL,
    max_usage INT NULL,
    current_usage INT DEFAULT 0,
    valid_from DATE NULL,
    valid_until DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_discounts_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Diskon per Pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_discounts (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    discount_id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NULL,
    applied_amount DECIMAL(15,2) NOT NULL,
    applied_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_discount (applicant_id, discount_id),
    CONSTRAINT fk_app_discount_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_discount_discount FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_app_discount_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_app_discount_applied_by FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
