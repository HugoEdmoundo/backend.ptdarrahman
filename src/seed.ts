/**
 * Reliable seed runner using parameterized queries (no SQL escaping issues).
 * Usage: npx tsx src/seed.ts
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { readFileSync } from 'fs'
import { join } from 'path'

function utcnow(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })

  console.log(`📡 Connected to MySQL: ${process.env.MYSQL_DATABASE}`)
  const now = utcnow()

  // 1. Apply schema (skip errors for existing tables)
  console.log('📋 Applying schema ...')
  const schema = readFileSync(join(__dirname, '../migrations/001_schema.sql'), 'utf8')
  const stmts = schema.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))
  for (const stmt of stmts) {
    try { await conn.execute(stmt) } catch { /* skip */ }
  }
  console.log('   ✅ Schema applied')

  // 2. Fix social_links path
  console.log('📋 Fixing social_links.path ...')
  try {
    await conn.execute('ALTER TABLE social_links MODIFY COLUMN path TEXT NOT NULL')
    console.log('   ✅ Altered to TEXT')
  } catch { console.log('   ⏭️  Already TEXT') }

  // 3. Seed roles
  console.log('🌱 Seeding roles ...')
  const roles = [
    { id: 'role-superadmin', name: 'Superadmin', description: 'Full system access', is_superadmin: 1, permissions: '{}' },
    { id: 'role-admin', name: 'Admin', description: 'Company profile admin', is_superadmin: 0, permissions: '{"companyprofile":"crud"}' },
    { id: 'role-editor', name: 'Editor', description: 'Read-only access to company profile', is_superadmin: 0, permissions: '{"companyprofile":"read"}' },
    { id: 'role-viewer', name: 'Viewer', description: 'Dashboard view only', is_superadmin: 0, permissions: '{"companyprofile":"dashboard"}' },
  ]
  for (const r of roles) {
    try {
      await conn.execute(
        'INSERT INTO roles (id, name, description, is_superadmin, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.description, r.is_superadmin, r.permissions, now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
      console.error(`   ⚠️  Role "${r.name}": ${e.message}`)
    }
  }
  console.log(`   ✅ ${roles.length} roles ready`)

  // 4. Seed superadmin user
  console.log('🌱 Seeding superadmin user ...')
  const bcryptModule = await import('bcryptjs')
  const bcrypt = (bcryptModule as any).default || bcryptModule
  const superadminHash = bcrypt.hashSync('SuperAdmin123!', 12)
  try {
    await conn.execute(
      `INSERT INTO users (id, username, password_hash, email, full_name, role_id, user_type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['user-superadmin', 'superadmin', superadminHash, 'superadmin@ptdarrahman.sch.id', 'Super Administrator', 'role-superadmin', 'superadmin', 1, now, now]
    )
    console.log('   ✅ superadmin / SuperAdmin123!')
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') console.log('   ⏭️  superadmin already exists')
    else console.error(`   ⚠️  ${e.message}`)
  }

  // 5. Seed site_settings
  console.log('🌱 Seeding site_settings ...')
  const settings: [string, string][] = [
    ['site_name', "Pesantren Tahfidz Qur'an dan Digital Arrahman"],
    ['site_description', 'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital modern'],
    ['logo', ''],
    ['favicon', ''],
    ['to_email', 'ptdarrahmanm9@gmail.com'],
    ['whatsapp', '081283612352'],
    ['whatsapp_number', '6281283612352'],
    ['whatsapp_message', "Assalamu'alaikum, saya ingin bertanya tentang Pesantren Ar-Rahman"],
    ['whatsapp_message_en', 'Peace be upon you, I would like to ask about Ar-Rahman Pesantren'],
    ['whatsapp_message_id', 'Halo, saya ingin bertanya tentang Pesantren Ar-Rahman'],
  ]
  for (const [key, value] of settings) {
    try {
      await conn.execute(
        'INSERT INTO site_settings (`key`, value, created_at, updated_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
        [key, value, now, now]
      )
    } catch (e: any) { if (e.code !== 'ER_DUP_ENTRY') console.error(`   ⚠️  ${key}: ${e.message}`) }
  }
  console.log(`   ✅ ${settings.length} settings ready`)

  // 6. Seed contact_info
  console.log('🌱 Seeding contact_info ...')
  try {
    await conn.execute(
      `INSERT INTO contact_info (id, address, phone_primary, phone_secondary, whatsapp, email_primary, email_admission, office_hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE address = VALUES(address), updated_at = VALUES(updated_at)`,
      ['contact-main',
        'Rukan Hexa Green, Jl. KH. Noer Ali No.17A, Kalimalang, Bekasi, Jawa Barat 17510',
        '021-8888-1234', '021-8888-5678', '081283612352',
        'info@ptdarrahman.sch.id', 'admission@ptdarrahman.sch.id',
        'Senin - Sabtu: 07:00 - 16:00', now, now]
    )
    console.log('   ✅ contact info ready')
  } catch (e: any) { console.error(`   ⚠️  ${e.message}`) }

  // 7. Seed news_articles
  console.log('🌱 Seeding news_articles ...')
  const newsData = [
    {
      id: 'news-1', slug: 'gold-medal-international-science-olympiad',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
      category: 'Prestasi', date: '2026-05-15',
      gallery: ['https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop'],
      content: {
        title: 'Siswa Ar-Rahman Raih Emas di Olimpiade Sains Internasional',
        excerpt: 'Siswa berbakat kami membawa pulang 3 medali emas dari Olimpiade Sains Pemuda Internasional di London.',
        content: 'Pesantren Ar-Rahman terus menorehkan prestasi di kancah internasional setelah tiga siswa kami meraih medali emas di Olimpiade Sains Pemuda Internasional (IYSO) di London, Inggris.\n\nKompetisi yang diikuti lebih dari 500 siswa dari 40 negara ini menguji peserta dalam bidang fisika, kimia, dan biologi.\n\nPeraih medali emas: Ahmad Rizki (Fisika), Siti Nurhaliza (Kimia), dan Muhammad Farhan (Biologi).',
        author: 'Tim Media Ar-Rahman',
      },
    },
    {
      id: 'news-2', slug: 'annual-cultural-festival-2026',
      image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop',
      category: 'Acara', date: '2026-04-28',
      gallery: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop'],
      content: {
        title: 'Festival Budaya Tahunan 2026: Perayaan Spektakuler',
        excerpt: 'Ribuan orang berkumpul untuk festival tahunan kami yang menampilkan pertunjukan budaya dan bazar megah.',
        content: 'Festival Budaya Tahunan Ar-Rahman 2026 sukses besar, menarik ribuan pengunjung dari seluruh wilayah Jabodetabek.\n\nFestival dengan tema "Unity in Diversity" menampilkan tarian tradisional, peragaan busana, dan produksi teater.',
        author: 'Tim Media Ar-Rahman',
      },
    },
    {
      id: 'news-3', slug: 'open-enrollment-2026-2027',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop',
      category: 'Penerimaan', date: '2026-04-01',
      gallery: null,
      content: {
        title: 'Pendaftaran Dibuka Tahun Ajaran 2027/2028',
        excerpt: 'Pendaftaran sekarang dibuka untuk tahun ajaran mendatang. Tempat terbatas di semua program.',
        content: 'Pesantren Tahfidz Quran dan Digital Arrahman mengumumkan pendaftaran untuk tahun ajaran 2027/2028.\n\nProgram: Tahfidz Al-Quran, Teknologi Digital, Bilingual, Akademi Kepemimpinan.\n\nJadwal: Pendaftaran awal 1 April - 31 Mei 2027.',
        author: 'Kantor Penerimaan',
      },
    },
    {
      id: 'news-4', slug: 'quran-competition-2026',
      image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
      category: 'Prestasi', date: '2026-03-20',
      gallery: null,
      content: {
        title: 'Siswa Ar-Rahman Dominasi Kompetisi Quran Tingkat Provinsi',
        excerpt: 'Siswa tahfidz kami meraih juara 1 di semua kategori pada MTQ Tingkat Provinsi.',
        content: 'Siswa Pesantren Ar-Rahman meraih juara pertama di semua kategori MTQ Tingkat Provinsi 2026.\n\nPemenang: Muhammad Al-Fatih (Hafalan 30 Juz), Ahmad Syakir (Tilawah), Siti Aisyah (Tafsir), Abdullah Hasan (Kaligrafi).',
        author: 'Tim Media Ar-Rahman',
      },
    },
  ]
  for (const n of newsData) {
    try {
      await conn.execute(
        `INSERT INTO news_articles (id, slug, image, category, date, gallery, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.slug, n.image, n.category, n.date,
         n.gallery ? JSON.stringify(n.gallery) : null,
         JSON.stringify(n.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
      console.error(`   ⚠️  ${n.slug}: ${e.message}`)
    }
  }
  console.log(`   ✅ ${newsData.length} news articles ready`)

  // 8. Seed programs
  console.log('🌱 Seeding programs ...')
  const programsData = [
    {
      id: 'prog-tahfidz', slug: 'tahfidz', icon: 'book-quran',
      image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
      content: {
        title: 'Tahfidz Al-Quran', tagline: 'Hafal Al-Quran dengan tajwid dan tafsir yang benar',
        desc: 'Program hafalan Al-Quran komprehensif yang dirancang untuk melahirkan huffaz yang memahami dan mengamalkan Al-Quran.',
        duration: '6 Tahun', level: 'SMP - SMA',
        highlights: ['Target hafalan 30 Juz', 'Sesi murajaah harian', 'Intensif Tajwid & Tashih', 'Studi Tafsir Al-Quran', 'Bahasa Arab Al-Quran', 'Tahsin & Qiraat Sab\'ah'],
        curriculum: ['Tahfidz 30 Juz', 'Tajwid & Makharijul Huruf', 'Tafsir Al-Mishbah', 'Tata Bahasa Arab Quran', 'Hadits Arba\'in', 'Fiqih Ibadah', 'Adab & Akhlak Islami', 'Imamah & Khitabah'],
        outcomes: ['Hafal 30 Juz Al-Quran', 'Menguasai tajwid secara teoritis & praktis', 'Mampu memimpin doa & shalat', 'Memahami tafsir ayat-ayat pilihan', 'Berakhlak mulia dengan nilai-nilai Quran'],
      },
    },
    {
      id: 'prog-digital', slug: 'digital', icon: 'laptop-code',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
      content: {
        title: 'Teknologi Digital', tagline: 'Kuasi coding, AI, dan inovasi digital',
        desc: 'Program teknologi mutakhir yang mempersiapkan siswa untuk era digital.',
        duration: '6 Tahun', level: 'SMP - SMA',
        highlights: ['Coding & Pemrograman', 'Kecerdasan Buatan (AI)', 'Robotik & IoT', 'Desain Digital', 'Keamanan Siber', 'Pengembangan Startup'],
        curriculum: ['Computational Thinking', 'Python & JavaScript', 'Web & Mobile Development', 'AI & Machine Learning', 'Teknik Robotik', 'Desain UI/UX', 'Pemasaran Digital', 'Kewirausahaan Teknologi'],
        outcomes: ['Menguasai minimal 2 bahasa pemrograman', 'Mampu membangun website & aplikasi', 'Memahami konsep AI & machine learning', 'Mampu merakit & memprogram robot', 'Siap bersaing di era digital global'],
      },
    },
    {
      id: 'prog-leadership', slug: 'leadership', icon: 'users',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop',
      content: {
        title: 'Akademi Kepemimpinan', tagline: 'Bangun karakter dan pimpin dengan dampak',
        desc: 'Program pengembangan kepemimpinan premium yang menumbuhkan kepercayaan diri, karakter, dan visi.',
        duration: '6 Tahun', level: 'SMP - SMA',
        highlights: ['Pembangunan Karakter', 'Kepemimpinan Proyek', 'Perusahaan Sosial', 'Public Speaking', 'Pengabdian Masyarakat', 'Jejaring Global'],
        curriculum: ['Teori Kepemimpinan', 'Kecerdasan Emosional', 'Resolusi Konflik', 'Manajemen Proyek', 'Kewirausahaan Sosial', 'Keterampilan Negosiasi', 'Kepemimpinan Sipil', 'Kewarganegaraan Global'],
        outcomes: ['Memimpin tim & organisasi', 'Mengelola proyek sosial', 'Public speaking yang percaya diri', 'Jiwa wirausaha sosial', 'Jejaring global & kepemimpinan'],
      },
    },
  ]
  for (const p of programsData) {
    try {
      await conn.execute(
        `INSERT INTO programs (id, slug, icon, image, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.slug, p.icon, p.image, JSON.stringify(p.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
      console.error(`   ⚠️  ${p.slug}: ${e.message}`)
    }
  }
  console.log(`   ✅ ${programsData.length} programs ready`)

  // 9. Seed facilities
  console.log('🌱 Seeding facilities ...')
  const facilitiesData = [
    { id: 'fac-lab-komputer', image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop', category: 'tech', content: { name: 'Lab Komputer', desc: 'Laboratorium komputer canggih dengan workstation berkinerja tinggi.', features: ['50+ PC High-end', 'VR Development Kit', 'Printer 3D', 'Ruang Server'] } },
    { id: 'fac-lab-sains', image: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop', category: 'academic', content: { name: 'Lab Sains', desc: 'Laboratorium sains lengkap untuk eksperimen fisika, kimia, dan biologi.', features: ['Lab Fisika', 'Lab Kimia', 'Lab Biologi', 'Ruang Mikroskopi'] } },
    { id: 'fac-perpustakaan', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop', category: 'academic', content: { name: 'Perpustakaan Digital', desc: 'Perpustakaan modern dengan koleksi buku dan sumber daya digital.', features: ['50,000+ Buku', 'Arsip Digital', 'Portal E-Library', 'Ruang Belajar'] } },
    { id: 'fac-masjid', image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop', category: 'worship', content: { name: 'Masjid', desc: 'Masjid luas untuk shalat harian dan studi Al-Quran.', features: ['Kapasitas 1,000+', 'AC & Sound System', 'Area Wudhu', 'Perpustakaan Islami'] } },
    { id: 'fac-olahraga', image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop', category: 'sports', content: { name: 'Kompleks Olahraga', desc: 'Kompleks olahraga standar Olimpiade.', features: ['Lapangan Sepak Bola', 'Lapangan Basket', 'Kolam Renang', 'Lapangan Futsal'] } },
    { id: 'fac-aula', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop', category: 'academic', content: { name: 'Auditorium', desc: 'Auditorium megah berkapasitas 800 kursi.', features: ['800 Kursi', 'Panggung Profesional', 'Layar LED', 'Sistem Akustik'] } },
    { id: 'fac-asrama', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop', category: 'boarding', content: { name: 'Asrama', desc: 'Fasilitas asrama nyaman dengan pengawasan 24/7.', features: ['Kamar Ber-AC', 'Ruang Belajar', 'Kantin', 'Keamanan 24/7'] } },
    { id: 'fac-seni', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop', category: 'arts', content: { name: 'Studio Seni & Musik', desc: 'Ruang kreatif untuk seni visual, musik, dan seni pertunjukan.', features: ['Studio Musik', 'Galeri Seni', 'Studio Tari', 'Latihan Band'] } },
  ]
  for (const f of facilitiesData) {
    try {
      await conn.execute(
        `INSERT INTO facilities (id, image, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [f.id, f.image, f.category, JSON.stringify(f.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${facilitiesData.length} facilities ready`)

  // 10. Seed staff
  console.log('🌱 Seeding staff ...')
  const staffData = [
    { id: 'staff-mudir', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop', role: 'leader', content: { name: 'KH. Ahmad Ziyad Khairy, S.E.', position: 'Mudir / Pimpinan Pesantren', bio: 'Pendiri dan pemimpin visioner Pesantren Ar-Rahman.', expertise: ['Studi Quran', 'Kepemimpinan Pendidikan', 'Keuangan Syariah'] } },
    { id: 'staff-kepsek', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop', role: 'leader', content: { name: 'Ustadz Farrel Muhammad Rizqy', position: 'Kepala Sekolah', bio: 'Pendidik berpengalaman dengan semangat mengintegrasikan nilai-nilai Islam.', expertise: ['Desain Kurikulum', 'Pelatihan Guru', 'Psikologi Pendidikan'] } },
    { id: 'staff-wakil', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop', role: 'leader', content: { name: 'Ustadz Ahmad Fauzan, M.Pd.', position: 'Wakil Kepala Kurikulum', bio: 'Spesialis kurikulum yang mengembangkan kerangka pembelajaran inovatif.', expertise: ['Pengembangan Kurikulum', 'Desain Penilaian', 'Pendidikan STEM'] } },
    { id: 'staff-tahfidz', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop', role: 'teacher', content: { name: 'Ustadz Syamsul Huda, S.Q.', position: 'Kepala Program Tahfidz', bio: 'Qari dan hafidz bersertifikat dengan sanad dari ulama terkemuka.', expertise: ['Tahfidz 30 Juz', 'Qiraat Sab\'ah', 'Tajwid'] } },
    { id: 'staff-digital', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1974&auto=format&fit=crop', role: 'teacher', content: { name: 'Rizki Pratama, S.Kom.', position: 'Kepala Program Digital', bio: 'Insinyur perangkat lunak yang beralih menjadi pendidik.', expertise: ['Full-Stack Development', 'AI/ML', 'Robotik'] } },
    { id: 'staff-bilingual', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop', role: 'teacher', content: { name: 'Sarah Williams, M.Ed.', position: 'Kepala Program Bilingual', bio: 'Penutur asli bahasa Inggris dengan pengalaman luas dalam pendidikan bilingual.', expertise: ['TESOL', 'Pendidikan Bilingual', 'Kurikulum Cambridge'] } },
    { id: 'staff-kepemimpinan', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop', role: 'teacher', content: { name: 'Dr. Muhammad Al-Ghazali', position: 'Mentor Akademi Kepemimpinan', bio: 'PhD dalam Kepemimpinan Organisasi dengan pengalaman 15+ tahun.', expertise: ['Pengembangan Kepemimpinan', 'Pendidikan Karakter', 'Pemberdayaan Pemuda'] } },
    { id: 'staff-quran-tafsir', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop', role: 'teacher', content: { name: 'Ustadzah Amaniyah, Lc.', position: 'Instruktur Quran & Tafsir', bio: 'Lulusan Universitas Islam Madinah. Spesialis dalam tafsir dan sastra Arab.', expertise: ['Tafsir Al-Quran', 'Sastra Arab', 'Tahsin'] } },
  ]
  for (const s of staffData) {
    try {
      await conn.execute(
        `INSERT INTO staff (id, image, role, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.image, s.role, JSON.stringify(s.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${staffData.length} staff ready`)

  // 11. Seed achievements
  console.log('🌱 Seeding achievements ...')
  const achievementsData = [
    { id: 'ach-1', year: 2026, image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop', content: { title: 'Medali Emas - Olimpiade Sains Pemuda Internasional', desc: '3 medali emas di kategori Fisika, Kimia, dan Biologi', scope: 'International' } },
    { id: 'ach-2', year: 2026, image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop', content: { title: 'Juara 1 - MTQ Tingkat Provinsi', desc: 'Juara pertama di semua 5 kategori kompetisi Al-Quran', scope: 'Provincial' } },
    { id: 'ach-3', year: 2025, image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop', content: { title: 'Penghargaan Sekolah Islam Terbaik', desc: 'Diakui sebagai Sekolah Islam Terbaik se-Jabodetabek', scope: 'National' } },
    { id: 'ach-4', year: 2025, image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop', content: { title: 'Juara Kompetisi Coding Nasional', desc: 'Juara 1 di Kompetisi Coding Nasional Tingkat Junior', scope: 'National' } },
    { id: 'ach-5', year: 2025, image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop', content: { title: 'Penghargaan Keunggulan TOEFL', desc: 'Rata-rata skor TOEFL tertinggi di antara sekolah berbasis pesantren', scope: 'National' } },
    { id: 'ach-6', year: 2024, image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop', content: { title: 'Finalis Kompetisi Robotik Internasional', desc: '10 besar finalis di Olimpiade Robotik Dunia', scope: 'International' } },
  ]
  for (const a of achievementsData) {
    try {
      await conn.execute(
        `INSERT INTO achievements (id, year, image, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [a.id, a.year, a.image, JSON.stringify(a.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${achievementsData.length} achievements ready`)

  // 12. Seed gallery_items
  console.log('🌱 Seeding gallery_items ...')
  const galleryData = [
    { id: 'gal-1', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop', category: 'campus', content: { title: 'Gedung Utama' } },
    { id: 'gal-2', image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop', category: 'academic', content: { title: 'Lab Komputer' } },
    { id: 'gal-3', image: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop', category: 'academic', content: { title: 'Lab Sains' } },
    { id: 'gal-4', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop', category: 'campus', content: { title: 'Perpustakaan' } },
    { id: 'gal-5', image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop', category: 'sports', content: { title: 'Kompleks Olahraga' } },
    { id: 'gal-6', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop', category: 'events', content: { title: 'Acara Auditorium' } },
    { id: 'gal-7', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop', category: 'arts', content: { title: 'Studio Seni' } },
    { id: 'gal-8', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop', category: 'academic', content: { title: 'Kelas Coding' } },
    { id: 'gal-9', image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop', category: 'events', content: { title: 'Pengajian Quran' } },
    { id: 'gal-10', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop', category: 'campus', content: { title: 'Asrama' } },
    { id: 'gal-11', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2070&auto=format&fit=crop', category: 'sports', content: { title: 'Hari Olahraga' } },
    { id: 'gal-12', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop', category: 'academic', content: { title: 'Kelas Bahasa' } },
  ]
  for (const g of galleryData) {
    try {
      await conn.execute(
        `INSERT INTO gallery_items (id, image, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [g.id, g.image, g.category, JSON.stringify(g.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${galleryData.length} gallery items ready`)

  // 13. Seed social_links
  console.log('🌱 Seeding social_links ...')
  const socialData = [
    { id: 'social-instagram', label: 'Instagram', href: 'https://www.instagram.com/ptdar_rahman/', path: 'instagram-icon' },
    { id: 'social-youtube', label: 'YouTube', href: 'https://www.youtube.com/@ptdar-rahman1417', path: 'youtube-icon' },
    { id: 'social-whatsapp', label: 'WhatsApp', href: 'https://wa.me/6281283612352', path: 'whatsapp-icon' },
    { id: 'social-linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/ptdar-rahman/', path: 'linkedin-icon' },
  ]
  for (const s of socialData) {
    try {
      await conn.execute(
        `INSERT INTO social_links (id, label, href, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.label, s.href, s.path, now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${socialData.length} social links ready`)

  // 14. Seed testimonials
  console.log('🌱 Seeding testimonials ...')
  const testimonialsData = [
    { id: 'test-1', name: 'Budi Santoso', child: 'Ahmad (Kelas 9)', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop', order: 1, content: { quote: 'Alhamdulillah, anak saya berkembang pesat baik dalam tahfidz maupun teknologi. Guru-gurunya sangat perhatian.', relation: 'Orang Tua Siswa' } },
    { id: 'test-2', name: 'Siti Rahayu', child: 'Fatimah (Kelas 7)', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop', order: 2, content: { quote: 'Pendidikan di Ar-Rahman benar-benar holistik. Anak saya tidak hanya pintar tapi juga berakhlak mulia.', relation: 'Orang Tua Siswa' } },
    { id: 'test-3', name: 'Muhammad Fadil', child: 'Umar (Kelas 8)', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop', order: 3, content: { quote: 'Program digitalnya luar biasa. Anak saya sudah bisa membuat website sendiri di usia 13 tahun!', relation: 'Orang Tua Siswa' } },
  ]
  for (const t of testimonialsData) {
    try {
      await conn.execute(
        `INSERT INTO testimonials (id, name, child, image, \`order\`, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.child, t.image, t.order, JSON.stringify(t.content), now, now]
      )
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') continue
    }
  }
  console.log(`   ✅ ${testimonialsData.length} testimonials ready`)

  // 15. Verify
  console.log('\n📊 Final verification:')
  const tables = ['site_settings', 'contact_info', 'roles', 'users', 'news_articles', 'programs', 'facilities', 'staff', 'achievements', 'gallery_items', 'social_links', 'testimonials']
  for (const t of tables) {
    try {
      const [rows] = await conn.execute<any[]>(`SELECT COUNT(*) as cnt FROM \`${t}\``)
      console.log(`   ${t}: ${rows[0].cnt} rows`)
    } catch { console.log(`   ${t}: ❌`) }
  }

  console.log('\n🎉 Seed migration complete!')
  await conn.end()
}

main()
