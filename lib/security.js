import crypto from 'crypto';
export const hash = v => crypto.createHmac('sha256', process.env.APP_SECRET).update(String(v)).digest('hex');
export const clientHash = req => hash((req.headers.get('x-forwarded-for') || '0').split(',')[0].trim());
export const safeEq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
export function signToken(phone, ttlMin = 30) {
  const p = Buffer.from(JSON.stringify({ phone, exp: Date.now() + ttlMin * 6e4 })).toString('base64url');
  return p + '.' + hash(p);
}
export function checkToken(t, phone) {
  try { const [p, s] = String(t).split('.'); if (!safeEq(hash(p), s)) return false;
    const d = JSON.parse(Buffer.from(p, 'base64url')); return d.phone === phone && d.exp > Date.now(); } catch { return false; }
}
export const isAdmin = req => safeEq((req.headers.get('authorization') || '').replace('Bearer ', ''), process.env.ADMIN_TOKEN);
export const bad = (msg, status = 400) => Response.json({ error: msg }, { status });
