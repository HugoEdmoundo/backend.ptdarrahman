import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from './config';
const MAX_SIZE = 5 * 1024 * 1024;
const MAGIC_BYTES = {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
};
const ALLOWED_TYPES = new Set(Object.keys(MAGIC_BYTES));
function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
function getUploadDir() {
    const dir = process.env.VERCEL ? '/tmp/uploads' : (config.uploadDir || 'uploads');
    ensureDir(dir);
    return dir;
}
function detectMime(content) {
    for (const [mime, magic] of Object.entries(MAGIC_BYTES)) {
        if (magic.every((b, i) => content[i] === b))
            return mime;
    }
    return null;
}
export function publicUrl(filename) {
    const baseUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || '8000'}`;
    return `${baseUrl}/uploads/${filename}`;
}
export async function saveUpload(file) {
    const content = new Uint8Array(await file.arrayBuffer());
    if (content.length > MAX_SIZE)
        throw new Error('File too large (max 5MB)');
    if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
    }
    const detected = detectMime(content);
    if (!detected)
        throw new Error('File content does not match allowed image types');
    const name = `${crypto.randomUUID()}.webp`;
    const dir = getUploadDir();
    const filePath = join(dir, name);
    writeFileSync(filePath, Buffer.from(content));
    return name;
}
export function deleteUpload(url) {
    if (!url)
        return;
    const filename = url.split('/').pop();
    if (!filename || !filename.includes('.'))
        return;
    if (filename.includes('..') || filename.includes('/')) {
        console.warn('blocked path traversal:', filename);
        return;
    }
    const filePath = join(getUploadDir(), filename);
    try {
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
    catch (e) {
        console.error('delete failed', e);
    }
}
export async function uploadBytes(filename, content) {
    const dir = getUploadDir();
    const filePath = join(dir, filename);
    writeFileSync(filePath, Buffer.from(content));
    return filename;
}
