export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const ADMIN_USER = process.env.ADMIN_USER || 'origgami';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1213';

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const { user, pass } = body;
    if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
      return res.status(200).json({ secret: process.env.ADMIN_SECRET });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
