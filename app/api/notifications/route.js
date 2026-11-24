import { q } from '@/lib/db';
import { checkToken, bad } from '@/lib/security';

export async function GET(req) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone') || '';
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!checkToken(token, phone)) return bad('Sign in to view employer notifications', 401);
  const { rows } = await q(
    'SELECT id,kind,message,created_at,read_at FROM notifications WHERE employer_phone=$1 ORDER BY created_at DESC LIMIT 30',
    [phone]
  );
  return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}
