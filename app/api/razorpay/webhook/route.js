import crypto from 'crypto';
import { q, tx } from '@/lib/db'; import { safeEq } from '@/lib/security';
export async function POST(req) {
  const raw = await req.text();
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  if (!safeEq(req.headers.get('x-razorpay-signature') || '', expected)) return new Response('Bad signature', { status: 400 });
  const ev = JSON.parse(raw), p = ev.payload?.payment?.entity;
  if (!p) return Response.json({ ok: true });
  if (ev.event === 'payment.captured') {
    await tx(async c => {
      const pay = (await c.query('SELECT p.*, j.contact_mobile, j.title FROM payments p JOIN job_posts j ON j.id=p.job_post_id WHERE p.gateway_order_id=$1 FOR UPDATE OF p', [p.order_id])).rows[0];
      if (!pay || pay.status === 'paid') return; // duplicate webhook: do nothing
      if (p.amount !== pay.amount_paise || p.currency !== 'INR') {
        await c.query("UPDATE payments SET status='mismatch', gateway_payment_id=$2 WHERE id=$1", [pay.id, p.id]);
        await c.query("INSERT INTO notifications(employer_phone,job_post_id,kind,message) VALUES($1,$2,'payment_mismatch',$3)", [pay.contact_mobile, pay.job_post_id, `A payment for “${pay.title}” needs review. The listing has not been published.`]); return;
      }
      await c.query("UPDATE payments SET status='paid', gateway_payment_id=$2, webhook_verified=true WHERE id=$1", [pay.id, p.id]);
      await c.query(`UPDATE job_posts SET status=CASE WHEN risk_flag THEN 'pending_review' ELSE 'published' END,
        published_at=now(), expires_at=now()+make_interval(days=>duration_days) WHERE id=$1 AND status='draft'`, [pay.job_post_id]);
      await c.query("INSERT INTO notifications(employer_phone,job_post_id,kind,message) VALUES($1,$2,'payment_received',$3)", [pay.contact_mobile, pay.job_post_id, `Payment received for “${pay.title}”. Your listing is being published.`]);
    });
  } else if (ev.event === 'payment.failed') {
    await tx(async c => {
      const pay = (await c.query('SELECT p.id,p.job_post_id,j.contact_mobile,j.title FROM payments p JOIN job_posts j ON j.id=p.job_post_id WHERE p.gateway_order_id=$1 AND p.status=\'created\' FOR UPDATE OF p', [p.order_id])).rows[0];
      if (!pay) return;
      await c.query("UPDATE payments SET status='failed' WHERE id=$1", [pay.id]);
      await c.query("INSERT INTO notifications(employer_phone,job_post_id,kind,message) VALUES($1,$2,'payment_failed',$3)", [pay.contact_mobile, pay.job_post_id, `Payment was not completed for “${pay.title}”. No listing was published.`]);
    });
  }
  return Response.json({ ok: true });
}
