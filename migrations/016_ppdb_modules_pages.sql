-- Migration 016: PPDB Module & Page Permissions Expansion
-- Menambahkan module payment, selection, notification, dashboard
-- dan page entries yang sesuai dengan halaman-halaman PPDB

-- Module baru
INSERT IGNORE INTO modules (id, `key`, name, created_at, updated_at) VALUES
(UUID(), 'payment', 'Pembayaran PPDB', NOW(3), NOW(3)),
(UUID(), 'selection', 'Seleksi PPDB', NOW(3), NOW(3)),
(UUID(), 'notification', 'Notifikasi PPDB', NOW(3), NOW(3)),
(UUID(), 'dashboard', 'Dashboard PPDB', NOW(3), NOW(3));

-- Ambil ID modules yang baru
SET @pay = (SELECT id FROM modules WHERE `key` = 'payment');
SET @sel = (SELECT id FROM modules WHERE `key` = 'selection');
SET @not = (SELECT id FROM modules WHERE `key` = 'notification');
SET @dash = (SELECT id FROM modules WHERE `key` = 'dashboard');
SET @ppdb = (SELECT id FROM modules WHERE `key` = 'ppdb');

-- Hapus pages lama untuk module-module PPDB agar sesuai dengan navigasi sidebar
DELETE FROM pages WHERE module_id IN (@ppdb, @pay, @sel, @not, @dash);

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

-- Pages untuk module Selection
INSERT INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @sel, 'test-sessions', 'Jadwal Tes', 'CalendarCheck', 1, NOW(3), NOW(3)),
(UUID(), @sel, 'test-scores', 'Nilai Tes', 'PenLine', 2, NOW(3), NOW(3)),
(UUID(), @sel, 'graduations', 'Kelulusan', 'Award', 3, NOW(3), NOW(3));

-- Pages untuk module Payment
INSERT INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @pay, 'payments', 'Data Pembayaran', 'Wallet', 1, NOW(3), NOW(3)),
(UUID(), @pay, 'invoices', 'Invoice', 'Receipt', 2, NOW(3), NOW(3)),
(UUID(), @pay, 'discounts', 'Diskon', 'Percent', 3, NOW(3), NOW(3));

-- Pages untuk module Notification
INSERT INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @not, 'notifications', 'Manajemen Notifikasi', 'Bell', 1, NOW(3), NOW(3));

-- Pages untuk module Dashboard
INSERT INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @dash, '', 'Overview Dashboard', 'LayoutDashboard', 1, NOW(3), NOW(3));
