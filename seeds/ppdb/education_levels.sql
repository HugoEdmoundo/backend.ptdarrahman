-- Seed: Education Levels
INSERT INTO education_levels (id, code, name, description, sort_order, is_active, created_at, updated_at) VALUES
(UUID(), 'TK', 'Taman Kanak-Kanak', 'Jenjang TK/RA', 1, 1, NOW(3), NOW(3)),
(UUID(), 'SD', 'Sekolah Dasar / MI', 'Jenjang SD/MI', 2, 1, NOW(3), NOW(3)),
(UUID(), 'SMP', 'Sekolah Menengah Pertama / MTs', 'Jenjang SMP/MTs', 3, 1, NOW(3), NOW(3)),
(UUID(), 'SMA', 'Sekolah Menengah Atas / MA', 'Jenjang SMA/MA', 4, 1, NOW(3), NOW(3)),
(UUID(), 'PESANTREN', 'Program Pesantren', 'Program Pesantren Terpadu', 5, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
