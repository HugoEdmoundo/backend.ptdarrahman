import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from './config'

const MAX_SIZE = 5 * 1024 * 1024
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
}

let _supabase: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  }
  return _supabase
}

function bucket() {
  return getClient().storage.from(config.supabaseStorageBucket)
}

export function publicUrl(filename: string): string {
  const { data } = bucket().getPublicUrl(filename)
  return data.publicUrl
}

export async function saveUpload(file: File): Promise<string> {
  const content = new Uint8Array(await file.arrayBuffer())
  if (content.length > MAX_SIZE) throw new Error('File too large (max 5MB)')

  const ct = file.type
  if (!MAGIC_BYTES[ct]) throw new Error(`Unsupported file type: ${ct}`)

  const magic = MAGIC_BYTES[ct]
  const detected = magic.every((b, i) => content[i] === b)
  if (!detected) throw new Error('File content does not match allowed image types')

  const name = `${crypto.randomUUID()}.webp`
  const result = await bucket().upload(name, content, { contentType: 'image/webp' })
  if (result.error) throw result.error
  return name
}

export function deleteUpload(url: string): void {
  if (!url) return
  const parts = url.split('/')
  const filename = parts[parts.length - 1]
  if (!filename.includes('.')) return
  if (!url.startsWith(config.supabaseUrl)) return
  if (filename.includes('..') || filename.includes('/')) {
    console.warn('blocked path traversal:', filename)
    return
  }
  bucket().remove([filename]).catch(e => console.error('delete failed', e))
}

export async function uploadBytes(filename: string, content: Uint8Array, contentType = 'image/png'): Promise<string> {
  const result = await bucket().upload(filename, content, { contentType })
  if (result.error) throw result.error
  return filename
}
