-- Seed: PPDB Roles
-- Permission lengkap untuk semua module

INSERT INTO roles (id, name, description, is_superadmin, permissions, created_at, updated_at) VALUES
(UUID(), 'Superadmin', 'Full system access', 0, '{"companyprofile":"crud","students":"crud","kunjungan":"crud","ppdb":"crud","payment":"crud","selection":"crud","notification":"crud","dashboard":"crud","superadmin":"crud"}', NOW(3), NOW(3)),
(UUID(), 'Admin PPDB', 'Mengelola PPDB: verifikasi dokumen, kelulusan, pengumuman', 0, '{"companyprofile":"dashboard","students":"read","ppdb":"crud","payment":"crud","selection":"crud","notification":"crud","dashboard":"crud"}', NOW(3), NOW(3)),
(UUID(), 'Admin Keuangan', 'Mengelola pembayaran & invoice PPDB', 0, '{"companyprofile":"dashboard","ppdb":"read","payment":"crud","dashboard":"read"}', NOW(3), NOW(3)),
(UUID(), 'Penguji', 'Menilai & menginput hasil tes seleksi', 0, '{"companyprofile":"dashboard","ppdb":"read","selection":"crud"}', NOW(3), NOW(3)),
(UUID(), 'Orang Tua', 'Memantau status pendaftaran anak', 0, '{"companyprofile":"dashboard","ppdb":"read"}', NOW(3), NOW(3)),
(UUID(), 'Calon Murid', 'Mendaftar & mengisi data PPDB', 0, '{"companyprofile":"dashboard","ppdb":"read"}', NOW(3), NOW(3)),
(UUID(), 'Admin Company Profile', 'Mengelola company profile', 0, '{"companyprofile":"crud","students":"read","kunjungan":"read","ppdb":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Editor', 'Read-only access to company profile', 0, '{"companyprofile":"read","ppdb":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Viewer', 'Dashboard view only', 0, '{"companyprofile":"dashboard","ppdb":"dashboard"}', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), permissions = VALUES(permissions);
