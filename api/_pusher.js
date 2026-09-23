import { createHash, createHmac } from 'node:crypto';

export function channelFor(room) {
  const r = String(room || 'principal').toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(r) ? 'rey-piratas-' + r : null;
}

export async function pusherRequest(method, path, body) {
  const { PUSHER_APP_ID: appId, PUSHER_KEY: key, PUSHER_SECRET: secret, PUSHER_CLUSTER: cluster } = process.env;
  if (!appId || !key || !secret || !cluster) throw new Error('Missing PUSHER_* environment variables');
  const fullPath = `/apps/${appId}${path}`;
  const payload = body ? JSON.stringify(body) : null;
  const params = { auth_key: key, auth_timestamp: String(Math.floor(Date.now() / 1000)), auth_version: '1.0' };
  if (payload) params.body_md5 = createHash('md5').update(payload).digest('hex');
  const query = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = createHmac('sha256', secret).update(`${method}\n${fullPath}\n${query}`).digest('hex');
  const res = await fetch(`https://api-${cluster}.pusher.com${fullPath}?${query}&auth_signature=${signature}`, {
    method,
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload,
  });
  if (!res.ok) throw new Error(`Pusher ${res.status}: ${await res.text()}`);
  return res.json();
}
