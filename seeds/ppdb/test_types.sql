-- Seed: Test Types
INSERT INTO test_types (id, code, name, description, is_active, created_at, updated_at) VALUES
(UUID(), 'BTQ', 'Baca Tulis Al-Quran', 'Tes kemampuan membaca dan menulis Al-Quran sesuai tajwid', 1, NOW(3), NOW(3)),
(UUID(), 'WAWANCARA', 'Wawancara', 'Wawancara calon murid dan orang tua', 1, NOW(3), NOW(3)),
(UUID(), 'AKADEMIK', 'Tes Akademik', 'Tes kemampuan akademik (Matematika, Bahasa, IPA)', 1, NOW(3), NOW(3)),
(UUID(), 'PSIKOTES', 'Psikotes', 'Tes psikologi dan potensi akademik', 1, NOW(3), NOW(3)),
(UUID(), 'TAHFIDZ', 'Tes Hafalan Al-Quran', 'Tes setoran hafalan Al-Quran', 1, NOW(3), NOW(3)),
(UUID(), 'KESEHATAN', 'Tes Kesehatan', 'Pemeriksaan kesehatan fisik', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
