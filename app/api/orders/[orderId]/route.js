import { q } from '@/lib/db';
// The browser polls this after Checkout closes. Only the webhook can change the status.
export async function GET(_r, { params }) {
  const { rows } = await q('SELECT p.status pay, j.status job, j.expires_at FROM payments p JOIN job_posts j ON j.id=p.job_post_id WHERE p.gateway_order_id=$1', [params.orderId]);
  return Response.json(rows[0] || { pay: 'unknown' });
}
