import { q } from '@/lib/db'; import { clientHash, bad } from '@/lib/security';
export async function POST(req) {
  const { jobId, reason, details } = await req.json().catch(() => ({}));
  if (!jobId || !reason) return bad('Choose a reason');
  const r = await q('INSERT INTO reports(job_post_id,reporter_hash,reason,details) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [jobId, clientHash(req), String(reason).slice(0, 60), String(details || '').slice(0, 300)]);
  if (r.rowCount) {
    // 3 different reporters hide the listing until a moderator decides
    await q(`UPDATE job_posts SET report_count=(SELECT count(*) FROM reports WHERE job_post_id=$1),
      status=CASE WHEN status='published' AND (SELECT count(*) FROM reports WHERE job_post_id=$1)>=3 THEN 'pending_review' ELSE status END WHERE id=$1`, [jobId]);
  }
  return Response.json({ ok: true });
}
