-- Migration 016: PPDB Module & Page Permissions Expansion
-- Memperbarui page entries modul PPDB agar sesuai dengan halaman-halaman PPDB

-- Ambil ID module PPDB
SET @ppdb = (SELECT id FROM modules WHERE `key` = 'ppdb');

-- Hapus pages lama untuk module PPDB agar sesuai dengan navigasi sidebar
DELETE FROM pages WHERE module_id = @ppdb;

-- Pages untuk module PPDB
INSERT INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @ppdb, 'periods', 'Periode & Gelombang', 'Calendar', 1, NOW(3), NOW(3)),
(UUID(), @ppdb, 'levels', 'Jenjang, Kategori & Alur', 'ListTree', 2, NOW(3), NOW(3)),
(UUID(), @ppdb, 'wave-configs', 'Konfigurasi Gelombang', 'Settings', 3, NOW(3), NOW(3)),
(UUID(), @ppdb, 'applicants', 'Pendaftar - Daftar', 'Users', 4, NOW(3), NOW(3)),
(UUID(), @ppdb, 'documents', 'Pendaftar - Verifikasi', 'FileCheck', 5, NOW(3), NOW(3)),
(UUID(), @ppdb, 'mou', 'Post-Seleksi - MOU', 'FileSignature', 6, NOW(3), NOW(3)),
(UUID(), @ppdb, 're-registrations', 'Post-Seleksi - Daftar Ulang', 'UserPlus', 7, NOW(3), NOW(3)),
(UUID(), @ppdb, 'mpls', 'Post-Seleksi - MPLS', 'Flag', 8, NOW(3), NOW(3)),
(UUID(), @ppdb, 'reports', 'Laporan PPDB', 'BarChart3', 9, NOW(3), NOW(3));
