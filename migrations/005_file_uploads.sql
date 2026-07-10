-- Migration 005: File Uploads (Shared Infrastructure)
-- Digunakan oleh PPDB documents, payment proofs, dll.

CREATE TABLE IF NOT EXISTS file_uploads (
    id VARCHAR(36) NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NULL,
    entity_type VARCHAR(50) NULL COMMENT 'applicant_document,payment_proof,etc',
    entity_id VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_file_uploads_entity (entity_type, entity_id),
    KEY idx_file_uploads_uploaded_by (uploaded_by),
    CONSTRAINT fk_file_uploads_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
