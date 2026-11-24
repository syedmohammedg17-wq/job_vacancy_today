import { q } from '@/lib/db'; import { isAdmin, bad } from '@/lib/security';
export async function GET(req) {
  if (!isAdmin(req)) return bad('Unauthorized', 401);
  const { rows } = await q(`SELECT j.id,j.title,j.business_name,j.city,j.contact_mobile,j.status,j.risk_flag,j.report_count,j.expires_at,
      COALESCE((SELECT json_agg(r.reason) FROM reports r WHERE r.job_post_id=j.id),'[]') reasons
    FROM job_posts j WHERE j.status='pending_review' OR j.report_count>0 OR j.status='published' ORDER BY (j.status='pending_review') DESC, j.report_count DESC, j.id DESC LIMIT 100`);
  return Response.json(rows);
}
