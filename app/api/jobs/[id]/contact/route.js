import { q } from '@/lib/db'; import { clientHash, bad } from '@/lib/security'; import { AGREEMENT_VERSION } from '@/lib/fee';
export async function POST(req, { params }) {
  const { id } = await params;
  const { accepted } = await req.json().catch(() => ({}));
  if (!accepted) return bad('Accept the applicant terms first');
  const ip = clientHash(req);
  const n = await q("SELECT count(*) FROM agreement_acceptances WHERE user_type='applicant' AND ip_hash=$1 AND accepted_at>now()-interval '1 hour'", [ip]);
  if (+n.rows[0].count >= 40) return bad('Too many requests', 429);
  const { rows } = await q("SELECT contact_mobile, whatsapp_mobile, contact_email FROM job_posts WHERE id=$1 AND status='published' AND expires_at>now()", [id]);
  if (!rows[0]) return bad('This job is no longer available', 404);
  await q("INSERT INTO agreement_acceptances(user_type,job_post_id,agreement_version,ip_hash) VALUES('applicant',$1,$2,$3)", [id, AGREEMENT_VERSION, ip]);
  return Response.json({ phone: rows[0].contact_mobile, whatsapp: rows[0].whatsapp_mobile || rows[0].contact_mobile, email: rows[0].contact_email || null });
}
