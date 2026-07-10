-- Seed: Registration Categories
INSERT INTO registration_categories (id, code, name, description, is_active, created_at, updated_at) VALUES
(UUID(), 'REGULER', 'Jalur Reguler', 'Pendaftaran reguler melalui gelombang PPDB', 1, NOW(3), NOW(3)),
(UUID(), 'PRESTASI', 'Jalur Prestasi', 'Pendaftaran dengan prestasi akademik/non-akademik', 1, NOW(3), NOW(3)),
(UUID(), 'TAHFIDZ', 'Jalur Tahfidz', 'Pendaftaran dengan hafalan Al-Quran minimal 5 Juz', 1, NOW(3), NOW(3)),
(UUID(), 'BEASISWA', 'Jalur Beasiswa', 'Pendaftaran dengan beasiswa (yatim, dhuafa, berprestasi)', 1, NOW(3), NOW(3)),
(UUID(), 'PINDAHAN', 'Jalur Pindahan', 'Pendaftaran pindahan dari sekolah/pesantren lain', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
