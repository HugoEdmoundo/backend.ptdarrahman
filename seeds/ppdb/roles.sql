-- Seed: PPDB Roles
-- Role tambahan untuk PPDB (superadmin, admin, editor, viewer sudah ada di seed.ts)

INSERT INTO roles (id, name, description, is_superadmin, permissions, created_at, updated_at) VALUES
(UUID(), 'Admin PPDB', 'Mengelola PPDB: verifikasi dokumen, kelulusan, pengumuman', 0, '{"ppdb":"crud","companyprofile":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Admin Keuangan', 'Mengelola pembayaran & invoice PPDB', 0, '{"ppdb":"read","payment":"crud","companyprofile":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Penguji', 'Menilai & menginput hasil tes seleksi', 0, '{"ppdb":"read","selection":"read","companyprofile":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Orang Tua', 'Memantau status pendaftaran anak', 0, '{"ppdb":"read","companyprofile":"dashboard"}', NOW(3), NOW(3)),
(UUID(), 'Calon Murid', 'Mendaftar & mengisi data PPDB', 0, '{"ppdb":"read","companyprofile":"dashboard"}', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
