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

-- Pages untuk module PPDB (tambah yang belum ada)
INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
-- PPDB existing pages (skip if exists via IGNORE)
(UUID(), @ppdb, 'dashboard', 'Dashboard', 'LayoutDashboard', 1, NOW(3), NOW(3)),
(UUID(), @ppdb, 'registration', 'Pendaftaran', 'FileText', 2, NOW(3), NOW(3)),
(UUID(), @ppdb, 'verification', 'Verifikasi Berkas', 'CheckCircle', 3, NOW(3), NOW(3)),
(UUID(), @ppdb, 'announcement', 'Pengumuman', 'Megaphone', 4, NOW(3), NOW(3)),
(UUID(), @ppdb, 'reports', 'Laporan', 'BarChart3', 5, NOW(3), NOW(3)),
(UUID(), @ppdb, 'settings', 'Pengaturan', 'Settings', 6, NOW(3), NOW(3)),
-- PPDB tambahan
(UUID(), @ppdb, 'periods', 'Periode', 'Calendar', 7, NOW(3), NOW(3)),
(UUID(), @ppdb, 'waves', 'Gelombang', 'Layers', 8, NOW(3), NOW(3)),
(UUID(), @ppdb, 'documents-review', 'Review Dokumen', 'FileCheck', 9, NOW(3), NOW(3)),
(UUID(), @ppdb, 'mou', 'MOU', 'FileSignature', 10, NOW(3), NOW(3)),
(UUID(), @ppdb, 'applicants', 'Daftar Pendaftar', 'Users', 11, NOW(3), NOW(3));

-- Pages untuk module Payment
INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @pay, 'dashboard', 'Dashboard', 'LayoutDashboard', 1, NOW(3), NOW(3)),
(UUID(), @pay, 'invoices', 'Invoice', 'Receipt', 2, NOW(3), NOW(3)),
(UUID(), @pay, 'transactions', 'Transaksi', 'ArrowLeftRight', 3, NOW(3), NOW(3)),
(UUID(), @pay, 'discounts', 'Diskon', 'Percent', 4, NOW(3), NOW(3)),
(UUID(), @pay, 'installments', 'Cicilan', 'CalendarClock', 5, NOW(3), NOW(3));

-- Pages untuk module Selection
INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @sel, 'dashboard', 'Dashboard', 'LayoutDashboard', 1, NOW(3), NOW(3)),
(UUID(), @sel, 'test-types', 'Jenis Tes', 'TestTube', 2, NOW(3), NOW(3)),
(UUID(), @sel, 'sessions', 'Sesi Tes', 'CalendarCheck', 3, NOW(3), NOW(3)),
(UUID(), @sel, 'scores', 'Penilaian', 'PenLine', 4, NOW(3), NOW(3)),
(UUID(), @sel, 'graduations', 'Kelulusan', 'Award', 5, NOW(3), NOW(3));

-- Pages untuk module Notification
INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @not, 'dashboard', 'Dashboard', 'LayoutDashboard', 1, NOW(3), NOW(3)),
(UUID(), @not, 'templates', 'Template', 'FileText', 2, NOW(3), NOW(3)),
(UUID(), @not, 'send', 'Kirim Notifikasi', 'Send', 3, NOW(3), NOW(3)),
(UUID(), @not, 'history', 'Riwayat', 'History', 4, NOW(3), NOW(3));

-- Pages untuk module Dashboard
INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES
(UUID(), @dash, 'overview', 'Overview', 'LayoutDashboard', 1, NOW(3), NOW(3)),
(UUID(), @dash, 'audit-log', 'Audit Log', 'ScrollText', 2, NOW(3), NOW(3)),
(UUID(), @dash, 'reports', 'Laporan', 'BarChart3', 3, NOW(3), NOW(3));
