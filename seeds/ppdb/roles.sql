-- Seed: PPDB Roles

INSERT INTO roles (id, name, description, is_superadmin, permissions, created_at, updated_at) VALUES
('role-superadmin', 'Superadmin', 'Full system access', 1, '{}', NOW(3), NOW(3)),
(UUID(), 'Admin Seleksi', 'Mengelola PPDB: konfigurasi, verifikasi dokumen, kelulusan, pengumuman', 0, '{"companyprofile":"dashboard","students":"read","ppdb":"crud","payment":"crud","selection":"crud","notification":"crud","dashboard":"crud"}', NOW(3), NOW(3)),
(UUID(), 'Admin Finance', 'Mengelola pembayaran & invoice PPDB', 0, '{"companyprofile":"dashboard","ppdb":"read","payment":"crud","dashboard":"read"}', NOW(3), NOW(3)),
(UUID(), 'Admin Penguji', 'Menilai & menginput hasil tes seleksi', 0, '{"companyprofile":"dashboard","ppdb":"read","selection":"crud"}', NOW(3), NOW(3)),
(UUID(), 'Calon Murid', 'Mendaftar & mengisi data PPDB', 0, '{"companyprofile":"dashboard","ppdb":"read"}', NOW(3), NOW(3)),
(UUID(), 'Editor', 'Read-only company profile', 0, '{"companyprofile":"read","ppdb":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Viewer', 'Dashboard view only', 0, '{"companyprofile":"dashboard","ppdb":"dashboard"}', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_superadmin = VALUES(is_superadmin), permissions = VALUES(permissions);
