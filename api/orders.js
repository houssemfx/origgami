import { put, get } from '@vercel/blob';

const PATHNAME = 'origami-orders.json';

async function loadOrders() {
  const file = await get(PATHNAME, { access: 'private', useCache: false });
  if (!file) return [];
  const text = await new Response(file.stream).text();
  return JSON.parse(text);
}

async function saveOrders(orders) {
  await put(PATHNAME, JSON.stringify(orders), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const isAdmin = req.headers['x-admin-secret'] === process.env.ADMIN_SECRET;

  if (req.method === 'GET') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const orders = await loadOrders();
      return res.status(200).json(orders);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    // Public: customers submit orders without auth
    try {
      const order = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const orders = await loadOrders();
      orders.unshift(order);
      await saveOrders(orders);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH' || req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const orders = await loadOrders();
      if (req.method === 'PATCH') {
        const { id, status } = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
        const o = orders.find(x => x.id === id);
        if (o) o.status = status;
      } else {
        const { id } = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
        const idx = orders.findIndex(x => x.id === id);
        if (idx > -1) orders.splice(idx, 1);
      }
      await saveOrders(orders);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
