// File storage on local disk instead of Firebase Storage / Google Cloud Storage.
// Files are written under UPLOAD_DIR (default ./storage/uploads) and served by /api/files/<path>.
// In production put UPLOAD_DIR on a persistent volume (or swap this module for S3/R2 later:
// only save() and fileUrl() need to change).
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage', 'uploads'));

export function resolveSafe(name) {
  const full = path.resolve(ROOT, String(name));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw Object.assign(new Error('Invalid file path'), { status: 400 });
  }
  return full;
}

class LocalFile {
  constructor(name) {
    this.name = String(name).replace(/^\/+/, '');
  }
  async save(data /* Buffer | Uint8Array | string */) {
    const full = resolveSafe(this.name);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }
  async makePublic() {} // every file under /api/files is public, as before
  async exists() {
    try { await fs.access(resolveSafe(this.name)); return [true]; } catch { return [false]; }
  }
  async delete() {
    await fs.rm(resolveSafe(this.name), { force: true });
  }
}

export const bucket = { name: 'local', file: (name) => new LocalFile(name) };
export const storage = { bucket: () => bucket };

// Absolute URL for a stored file (mobile apps need absolute URLs).
// Set APP_BASE_URL (e.g. https://api.yourdomain.com) in production; otherwise it is derived from the request.
export function fileUrl(name, req) {
  const clean = String(name).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  let base = process.env.APP_BASE_URL;
  if (!base && req) {
    const proto = req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host) base = `${proto}://${host}`;
  }
  return `${(base || '').replace(/\/$/, '')}/api/files/${clean}`;
}
