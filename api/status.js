import { channelFor, pusherRequest } from './_pusher.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const channel = channelFor(req.query?.room);
  if (!channel) return res.status(400).json({ error: 'invalid_room' });
  try {
    const info = await pusherRequest('GET', `/channels/${channel}`);
    return res.status(200).json({ online: Boolean(info.occupied) });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'pusher_failed' });
  }
}
