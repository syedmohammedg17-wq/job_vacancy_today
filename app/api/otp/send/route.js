import crypto from 'crypto';
import { q } from '@/lib/db'; import { hash, clientHash, bad } from '@/lib/security'; import { sendOtp } from '@/lib/sms';
export async function POST(req) {
  if (!process.env.DATABASE_URL || !process.env.APP_SECRET) return bad('Sign-in is not configured yet. Add DATABASE_URL and APP_SECRET to .env.local, run db/schema.sql, and restart the app.', 503);
  const { phone } = await req.json().catch(() => ({}));
  if (!/^[6-9]\d{9}$/.test(phone || '')) return bad('Enter a valid 10-digit mobile number');
  try {
    if ((await q('SELECT 1 FROM blacklist WHERE phone=$1', [phone])).rowCount) return bad('This number cannot post jobs', 403);
    const ip = clientHash(req);
    const a = await q("SELECT count(*) FROM otp_requests WHERE phone=$1 AND created_at>now()-interval '1 hour'", [phone]);
    const b = await q("SELECT count(*) FROM otp_requests WHERE ip_hash=$1 AND created_at>now()-interval '1 hour'", [ip]);
    if (+a.rows[0].count >= 3 || +b.rows[0].count >= 10) return bad('Too many attempts. Try again in an hour.', 429);
    const code = String(crypto.randomInt(100000, 1000000));
    await q("INSERT INTO otp_requests(phone,ip_hash,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')", [phone, ip, hash(phone + code)]);
    const delivery = await sendOtp(phone, code);
    return Response.json({ ok: true, ...(process.env.NODE_ENV !== 'production' ? { developmentCode: delivery?.developmentCode } : {}) });
  } catch (error) {
    console.error('OTP send failed:', error.message);
    return bad('Could not send a sign-in code. Check your database connection and SMS configuration.', 503);
  }
}
