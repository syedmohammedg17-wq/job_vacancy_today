import { q, tx } from '@/lib/db'; import { isAdmin, bad } from '@/lib/security'; import { refund } from '@/lib/razorpay';
export async function POST(req) {
  if (!isAdmin(req)) return bad('Unauthorized', 401);
  const { jobId, action, note } = await req.json().catch(() => ({}));
  const job = (await q('SELECT * FROM job_posts WHERE id=$1', [jobId])).rows[0];
  if (!job) return bad('Not found', 404);
  if (action === 'approve') await q("UPDATE job_posts SET status='published', risk_flag=false WHERE id=$1 AND status='pending_review' AND expires_at>now()", [jobId]);
  else if (action === 'reject' || action === 'remove') await q('UPDATE job_posts SET status=$2 WHERE id=$1', [jobId, action === 'reject' ? 'rejected' : 'removed']);
  else if (action === 'blacklist') {
    await tx(async c => {
      await c.query('INSERT INTO blacklist(phone,reason) VALUES($1,$2) ON CONFLICT DO NOTHING', [job.contact_mobile, note || 'confirmed fraud']);
      await c.query("UPDATE job_posts SET status='removed' WHERE contact_mobile=$1 AND status IN ('published','pending_review')", [job.contact_mobile]);
    });
  } else if (action === 'refund') {
    const p = (await q("SELECT * FROM payments WHERE job_post_id=$1 AND status='paid'", [jobId])).rows[0];
    if (!p) return bad('No paid payment to refund');
    await refund(p.gateway_payment_id, p.amount_paise);
    await q("UPDATE payments SET status='refunded' WHERE id=$1", [p.id]);
    await q("UPDATE job_posts SET status='removed' WHERE id=$1", [jobId]);
  } else return bad('Unknown action');
  await q('INSERT INTO moderation_log(job_post_id,action,note) VALUES($1,$2,$3)', [jobId, action, note || null]);
  return Response.json({ ok: true });
}
