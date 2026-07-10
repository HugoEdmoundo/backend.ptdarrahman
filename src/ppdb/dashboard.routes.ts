import { Hono } from 'hono'
import { getCurrentUser } from '../middleware/auth'
import { requireDashboardCrud } from './middleware'
import { listAll, getById, getByColumn, searchPaginated, getRawPool } from '../db/mysql'
import type { Variables } from '../types'

const dashboard = new Hono<{ Variables: Variables }>()

dashboard.get('/stats', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [r1] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants')
  const [r2] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['registered'])
  const [r3] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['testing'])
  const [r4] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicants WHERE current_status = ?', ['accepted'])
  const [r5] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM payment_transactions WHERE status = ?', ['pending'])
  const [r6] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM applicant_documents WHERE status = ?', ['uploaded'])
  const [r7] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM ppdb_periods')
  const [r8] = await pool.execute<any[]>('SELECT COUNT(*) as cnt FROM ppdb_waves')

  return c.json({
    total_applicants: r1[0].cnt,
    registered: r2[0].cnt,
    testing: r3[0].cnt,
    accepted: r4[0].cnt,
    pending_payments: r5[0].cnt,
    pending_documents: r6[0].cnt,
    total_periods: r7[0].cnt,
    total_waves: r8[0].cnt,
  })
})

dashboard.get('/audit-logs', getCurrentUser, requireDashboardCrud, async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const result = await searchPaginated('audit_log', { page, perPage: 20, order: 'created_at.desc' })
  return c.json(result)
})

dashboard.get('/reports/summary', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()

  // Applicants per wave
  const [waveStats] = await pool.execute<any[]>(`
    SELECT w.name as wave_name, COUNT(a.id) as total
    FROM ppdb_waves w
    LEFT JOIN wave_configurations wc ON wc.wave_id = w.id
    LEFT JOIN applicants a ON a.wave_config_id = wc.id
    GROUP BY w.id, w.name
    ORDER BY w.wave_number
  `)

  // Applicants per level
  const [levelStats] = await pool.execute<any[]>(`
    SELECT el.name as level_name, COUNT(a.id) as total
    FROM education_levels el
    LEFT JOIN wave_configurations wc ON wc.level_id = el.id
    LEFT JOIN applicants a ON a.wave_config_id = wc.id
    GROUP BY el.id, el.name
    ORDER BY el.sort_order
  `)

  // Payment summary
  const [paymentStats] = await pool.execute<any[]>(`
    SELECT status, COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total_amount
    FROM invoices GROUP BY status
  `)

  return c.json({ waveStats, levelStats, paymentStats })
})

// ════════ CSV Export Reports ════════

function toCSV(rows: any[], headers: string[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

function csvResponse(data: string, filename: string) {
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

dashboard.get('/reports/export/applicants', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(`
    SELECT a.registration_number, ap.full_name, ap.gender, ap.birth_place, ap.birth_date,
           ap.nik, ap.nisn, ap.phone, ap.email, ap.address, ap.previous_school,
           a.current_status, a.created_at,
           el.name as level_name, rc.name as category_name,
           pw.name as wave_name, pp.name as period_name
    FROM applicants a
    JOIN applicant_profiles ap ON ap.applicant_id = a.id
    LEFT JOIN wave_configurations wc ON wc.id = a.wave_config_id
    LEFT JOIN education_levels el ON el.id = wc.level_id
    LEFT JOIN registration_categories rc ON rc.id = wc.category_id
    LEFT JOIN ppdb_waves pw ON pw.id = wc.wave_id
    LEFT JOIN ppdb_periods pp ON pp.id = pw.period_id
    ORDER BY a.created_at DESC
  `)

  const headers = ['nomor_pendaftaran','nama_lengkap','gender','tempat_lahir','tanggal_lahir',
    'nik','nisn','telepon','email','alamat','asal_sekolah','status','tanggal_daftar',
    'jenjang','kategori','gelombang','periode']

  return csvResponse(toCSV(rows, headers), 'daftar-pendaftar.csv')
})

dashboard.get('/reports/export/payments', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(`
    SELECT i.invoice_number, ap.full_name, a.registration_number,
           ps.name as stage_name, i.total_amount, i.discount_amount,
           i.paid_at, i.due_date, i.status,
           t.transaction_number, t.amount as paid_amount, t.payment_method, t.status as txn_status,
           t.created_at as payment_date
    FROM invoices i
    LEFT JOIN applicants a ON a.id = i.applicant_id
    LEFT JOIN applicant_profiles ap ON ap.applicant_id = a.id
    LEFT JOIN payment_stages ps ON ps.id = i.payment_stage_id
    LEFT JOIN payment_transactions t ON t.invoice_id = i.id
    ORDER BY i.created_at DESC
  `)

  const headers = ['nomor_invoice','nama','nomor_pendaftaran','tahap','total_tagihan',
    'diskon','tanggal_lunas','jatuh_tempo','status_invoice',
    'nomor_transaksi','jumlah_bayar','metode','status_transaksi','tanggal_bayar']

  return csvResponse(toCSV(rows, headers), 'rekap-pembayaran.csv')
})

dashboard.get('/reports/export/selection', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(`
    SELECT a.registration_number, ap.full_name,
           tt.name as test_type, atr.total_score, atr.is_passed,
           ag.is_graduated, ag.graduation_rank, ag.total_score as final_score
    FROM applicants a
    JOIN applicant_profiles ap ON ap.applicant_id = a.id
    LEFT JOIN applicant_test_results atr ON atr.applicant_id = a.id
    LEFT JOIN test_types tt ON tt.id = atr.test_type_id
    LEFT JOIN applicant_graduations ag ON ag.applicant_id = a.id
    ORDER BY a.created_at DESC
  `)

  const headers = ['nomor_pendaftaran','nama','tipe_tes','skor','lulus_tes',
    'lulus_seleksi','peringkat','skor_akhir']

  return csvResponse(toCSV(rows, headers), 'hasil-seleksi.csv')
})

dashboard.get('/reports/export/documents', getCurrentUser, requireDashboardCrud, async (c) => {
  const pool = getRawPool()
  const [rows] = await pool.execute<any[]>(`
    SELECT a.registration_number, ap.full_name,
           dr.name as doc_name, dr.is_required,
           ad.status as doc_status, ad.verified_at, ad.rejection_reason,
           ad.created_at as upload_date
    FROM applicants a
    JOIN applicant_profiles ap ON ap.applicant_id = a.id
    CROSS JOIN document_requirements dr
    LEFT JOIN applicant_documents ad ON ad.applicant_id = a.id AND ad.requirement_id = dr.id
    WHERE dr.is_active = 1
    ORDER BY a.registration_number, dr.sort_order
  `)

  const headers = ['nomor_pendaftaran','nama','dokumen','wajib',
    'status','tanggal_verifikasi','alasan_tolak','tanggal_upload']

  return csvResponse(toCSV(rows, headers), 'status-dokumen.csv')
})

export default dashboard
