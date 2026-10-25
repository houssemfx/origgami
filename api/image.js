import { put, get } from '@vercel/blob';
import { randomUUID } from 'crypto';

// Product images live as separate blobs so origami-data.json (and the admin's
// localStorage cache) only hold short URLs instead of base64 data.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const p = String(req.query.p || '');
    if (!/^images\/[\w-]+\.(jpg|png|webp)$/.test(p)) return res.status(400).end();
    try {
      const file = await get(p, { access: 'private' });
      if (!file || file.statusCode !== 200) return res.status(404).end();
      const buf = Buffer.from(await new Response(file.stream).arrayBuffer());
      res.setHeader('Content-Type', file.blob.contentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status(200).send(buf);
    } catch (e) {
      return res.status(404).end();
    }
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(body.dataUrl || '');
      if (!m) return res.status(400).json({ error: 'Invalid image' });
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const pathname = `images/${randomUUID()}.${ext}`;
      await put(pathname, Buffer.from(m[2], 'base64'), {
        access: 'private',
        addRandomSuffix: false,
        contentType: `image/${m[1]}`,
      });
      return res.status(200).json({ url: `/api/image?p=${pathname}` });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
