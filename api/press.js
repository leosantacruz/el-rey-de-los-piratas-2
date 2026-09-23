import { channelFor, pusherRequest } from './_pusher.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const channel = channelFor(req.body?.room);
  if (!channel) return res.status(400).json({ error: 'invalid_room' });
  try {
    await pusherRequest('POST', '/events', { name: 'press', channels: [channel], data: JSON.stringify({ at: Date.now() }) });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'pusher_failed' });
  }
}
