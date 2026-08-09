import { Resend } from 'resend'

let resend: Resend | null = null

async function getResend(): Promise<Resend | null> {
  if (resend) return resend
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  resend = new Resend(key)
  return resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@ptdarrahman.sch.id'

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = await getResend()
  if (!client) {
    console.log(`[EMAIL] Skipping send (no API key). To: ${to}, Subject: ${subject}`)
    return false
  }
  try {
    const { error } = await client.emails.send({ from: `PPDB Arrahman <${FROM_EMAIL}>`, to, subject, html })
    if (error) { console.error('[EMAIL] Error:', error); return false }
    return true
  } catch (e) {
    console.error('[EMAIL] Failed:', e)
    return false
  }
}
