import mysql from 'mysql2/promise'

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ptdarrahman',
  })

  console.log('Connected, applying migration...')

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const modulesData = [
    { id: 'mod-companyprofile', key: 'companyprofile', name: 'Company Profile', pages: [
      { id: 'page-cp-news', key: 'news', label: 'Berita', icon: 'Newspaper', so: 1 },
      { id: 'page-cp-programs', key: 'programs', label: 'Program', icon: 'GraduationCap', so: 2 },
      { id: 'page-cp-facilities', key: 'facilities', label: 'Fasilitas', icon: 'Building2', so: 3 },
      { id: 'page-cp-staff', key: 'staff', label: 'Staff', icon: 'Users', so: 4 },
      { id: 'page-cp-achievements', key: 'achievements', label: 'Prestasi', icon: 'Trophy', so: 5 },
      { id: 'page-cp-gallery', key: 'gallery', label: 'Galeri', icon: 'Image', so: 6 },
      { id: 'page-cp-testimonials', key: 'testimonials', label: 'Testimoni', icon: 'MessageSquare', so: 7 },
      { id: 'page-cp-social', key: 'social-links', label: 'Tautan Sosial', icon: 'Link', so: 8 },
      { id: 'page-cp-contact', key: 'contact', label: 'Info Kontak', icon: 'Phone', so: 9 },
      { id: 'page-cp-settings', key: 'settings', label: 'Pengaturan', icon: 'Settings', so: 10 },
    ]},
    { id: 'mod-ppdb', key: 'ppdb', name: 'PPDB', pages: [
      { id: 'page-ppdb-dashboard', key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', so: 1 },
      { id: 'page-ppdb-registration', key: 'registration', label: 'Pendaftaran', icon: 'FileText', so: 2 },
      { id: 'page-ppdb-verification', key: 'verification', label: 'Verifikasi Berkas', icon: 'CheckCircle', so: 3 },
      { id: 'page-ppdb-announcement', key: 'announcement', label: 'Pengumuman', icon: 'Megaphone', so: 4 },
      { id: 'page-ppdb-reports', key: 'reports', label: 'Laporan', icon: 'BarChart3', so: 5 },
      { id: 'page-ppdb-settings', key: 'settings', label: 'Pengaturan', icon: 'Settings', so: 6 },
    ]},
    { id: 'mod-students', key: 'students', name: 'Students', pages: [
      { id: 'page-students-dashboard', key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', so: 1 },
      { id: 'page-students-list', key: 'list', label: 'Data Siswa', icon: 'Users', so: 2 },
      { id: 'page-students-reports', key: 'reports', label: 'Laporan', icon: 'BarChart3', so: 3 },
    ]},
    { id: 'mod-kunjungan', key: 'kunjungan', name: 'Kunjungan', pages: [
      { id: 'page-kunjungan-dashboard', key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', so: 1 },
      { id: 'page-kunjungan-schedule', key: 'schedule', label: 'Jadwal', icon: 'Calendar', so: 2 },
      { id: 'page-kunjungan-reports', key: 'reports', label: 'Laporan', icon: 'BarChart3', so: 3 },
    ]},
  ]

  // Create tables
  await conn.execute(`CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(36) NOT NULL, \`key\` VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id), UNIQUE KEY uk_modules_key (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  await conn.execute(`CREATE TABLE IF NOT EXISTS pages (
    id VARCHAR(36) NOT NULL, module_id VARCHAR(36) NOT NULL,
    \`key\` VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL,
    icon VARCHAR(50) DEFAULT '', sort_order INT DEFAULT 0,
    created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id), UNIQUE KEY uk_pages_module_key (module_id, \`key\`),
    CONSTRAINT fk_pages_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  await conn.execute(`CREATE TABLE IF NOT EXISTS user_page_permissions (
    id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, page_id VARCHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id), UNIQUE KEY uk_user_page (user_id, page_id),
    CONSTRAINT fk_upp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_upp_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  console.log('Tables created.')

  for (const mod of modulesData) {
    await conn.execute('INSERT IGNORE INTO modules (id, `key`, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [mod.id, mod.key, mod.name, now, now])
    for (const p of mod.pages) {
      await conn.execute('INSERT IGNORE INTO pages (id, module_id, `key`, label, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [p.id, mod.id, p.key, p.label, p.icon, p.so, now, now])
    }
  }

  const [rows] = await conn.execute('SELECT COUNT(*) as c FROM modules') as any
  const [rows2] = await conn.execute('SELECT COUNT(*) as c FROM pages') as any
  console.log(`modules: ${rows[0].c}, pages: ${rows2[0].c}`)
  await conn.end()
}

main().catch(e => { console.error(e); process.exit(1) })
