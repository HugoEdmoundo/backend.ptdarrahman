-- Migration 010: PPDB Document Tables
-- document_requirements, applicant_documents

-- ============================================================
-- 1. Persyaratan Dokumen per Jenjang/Kategori
-- ============================================================
CREATE TABLE IF NOT EXISTS document_requirements (
    id VARCHAR(36) NOT NULL,
    level_id VARCHAR(36) NULL COMMENT 'NULL = berlaku untuk semua jenjang',
    category_id VARCHAR(36) NULL COMMENT 'NULL = berlaku untuk semua kategori',
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    file_type VARCHAR(50) DEFAULT 'pdf' COMMENT 'pdf,jpg,png',
    max_size_mb INT DEFAULT 5,
    is_required TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_doc_req_level FOREIGN KEY (level_id) REFERENCES education_levels(id) ON DELETE SET NULL,
    CONSTRAINT fk_doc_req_category FOREIGN KEY (category_id) REFERENCES registration_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Dokumen yang Diupload Pendaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS applicant_documents (
    id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    requirement_id VARCHAR(36) NOT NULL,
    file_upload_id VARCHAR(36) NULL,
    file_url VARCHAR(500) NULL,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending,uploaded,verified,rejected',
    verified_by VARCHAR(36) NULL,
    verified_at DATETIME(3) NULL,
    rejection_reason TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_applicant_doc (applicant_id, requirement_id),
    KEY idx_app_doc_status (status),
    CONSTRAINT fk_app_doc_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_doc_requirement FOREIGN KEY (requirement_id) REFERENCES document_requirements(id) ON DELETE RESTRICT,
    CONSTRAINT fk_app_doc_upload FOREIGN KEY (file_upload_id) REFERENCES file_uploads(id) ON DELETE SET NULL,
    CONSTRAINT fk_app_doc_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
