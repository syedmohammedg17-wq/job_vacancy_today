import { q } from '@/lib/db'; import { hash, safeEq, signToken, bad } from '@/lib/security';
export async function POST(req) {
  if (!process.env.DATABASE_URL || !process.env.APP_SECRET) return bad('Sign-in is not configured yet. Add DATABASE_URL and APP_SECRET to .env.local, run db/schema.sql, and restart the app.', 503);
  const { phone, code } = await req.json().catch(() => ({}));
  try {
    const { rows } = await q('SELECT * FROM otp_requests WHERE phone=$1 AND verified=false AND expires_at>now() ORDER BY id DESC LIMIT 1', [phone]);
    const r = rows[0]; if (!r) return bad('Code expired. Request a new one.');
    if (r.attempts >= 5) return bad('Too many wrong codes. Request a new one.', 429);
    await q('UPDATE otp_requests SET attempts=attempts+1 WHERE id=$1', [r.id]);
    if (!safeEq(hash(phone + String(code)), r.code_hash)) return bad('Wrong code');
    await q('UPDATE otp_requests SET verified=true WHERE id=$1', [r.id]);
    await q('INSERT INTO employers(phone) VALUES($1) ON CONFLICT(phone) DO UPDATE SET last_login_at=now()', [phone]);
    return Response.json({ otpToken: signToken(phone) }); // valid 30 minutes, bound to this phone
  } catch (error) {
    console.error('OTP verification failed:', error.message);
    return bad('Could not verify the code. Check the database connection and confirm db/schema.sql has been applied.', 503);
  }
}
