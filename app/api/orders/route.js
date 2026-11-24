import { q, tx } from '@/lib/db'; import { checkToken, clientHash, bad } from '@/lib/security';
import { validate, scan } from '@/lib/fraud'; import { fee, AGREEMENT_VERSION } from '@/lib/fee'; import { createOrder } from '@/lib/razorpay';
export async function POST(req) {
  const { job: d, otpToken, termsAccepted } = await req.json().catch(() => ({}));
  if (!d) return bad('Missing job');
  const errs = validate(d); if (errs.length) return Response.json({ error: 'Fix these fields', fields: errs }, { status: 400 });
  if (!termsAccepted) return bad('Accept the employer terms to continue');
  if (!checkToken(otpToken, d.contact_mobile)) return bad('Verify your mobile number with the OTP first', 401);
  if ((await q('SELECT 1 FROM blacklist WHERE phone=$1', [d.contact_mobile])).rowCount) return bad('This number cannot post jobs', 403);
  const s = scan(d); if (s.blocked) return bad(s.blocked);
  const dup = await q("SELECT 1 FROM job_posts WHERE contact_mobile=$1 AND lower(title)=lower($2) AND status IN ('published','pending_review') AND expires_at>now()", [d.contact_mobile, d.title]);
  if (dup.rowCount) return bad('A live listing with this title and phone number already exists');
  const n = await q("SELECT count(*) FROM job_posts WHERE contact_mobile=$1 AND created_at>now()-interval '1 day'", [d.contact_mobile]);
  if (+n.rows[0].count >= 10) return bad('Daily posting limit reached', 429);
  let f; try { f = fee(+d.duration_days, !!d.featured); } catch { return bad('Choose 7, 15 or 30 days'); }
  const ip = clientHash(req);
  let result;
  try { result = await tx(async c => {
    // Serialize posting decisions per employer so simultaneous requests cannot bypass the free allowance.
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [d.contact_mobile]);
    const duplicate = await c.query("SELECT 1 FROM job_posts WHERE contact_mobile=$1 AND lower(title)=lower($2) AND status IN ('published','pending_review') AND expires_at>now()", [d.contact_mobile, d.title]);
    if (duplicate.rowCount) throw new Error('DUPLICATE_LISTING');
    const freeUsed = await c.query("SELECT created_at > now()-interval '3 months' AS within_cooldown FROM job_posts WHERE contact_mobile=$1 AND listing_type='free' ORDER BY created_at DESC LIMIT 1", [d.contact_mobile]);
    const freeEligible = !freeUsed.rowCount || !freeUsed.rows[0].within_cooldown;
    const isFree = freeEligible && !d.featured;
    const duration = isFree ? 15 : +d.duration_days;
    if (isFree) f = { base: 0, totalPaise: 0 };
    const j = await c.query(`INSERT INTO job_posts(business_name,business_type,address,city,locality,title,description,vacancies,salary_text,work_timings,contact_mobile,whatsapp_mobile,duration_days,featured,risk_flag,listing_type,status,published_at,expires_at,contact_email)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,CASE WHEN $17 THEN CASE WHEN $15 THEN 'pending_review' ELSE 'published' END ELSE 'draft' END,CASE WHEN $17 THEN now() END,CASE WHEN $17 THEN now()+make_interval(days=>$13) END,$18) RETURNING id`,
      [d.business_name, d.business_type || 'Other', d.address, d.city, d.locality || d.city, d.title, d.description || '', +d.vacancies, d.salary_text, d.work_timings || '', d.contact_mobile, d.whatsapp_mobile || null, duration, !!d.featured && !isFree, !!s.risk, isFree ? 'free' : 'paid', isFree, d.contact_email?.trim() || null]);
    const jobId = j.rows[0].id;
    await c.query("INSERT INTO agreement_acceptances(user_type,job_post_id,agreement_version,ip_hash) VALUES('employer',$1,$2,$3)", [jobId, AGREEMENT_VERSION, ip]);
    if (isFree) await c.query("INSERT INTO notifications(employer_phone,job_post_id,kind,message) VALUES($1,$2,$3,$4)", [d.contact_mobile, jobId, s.risk ? 'job_review' : 'job_published', s.risk ? `Your free listing “${d.title}” was received and is awaiting review.` : `Your free 15-day listing “${d.title}” is live.`]);
    return { jobId, isFree, duration };
  }); } catch (e) { if (e.message === 'DUPLICATE_LISTING') return bad('A live listing with this title and phone number already exists'); throw e; }
  if (result.isFree) return Response.json({ free: true, jobId: result.jobId, durationDays: result.duration });
  const order = await createOrder(f.totalPaise, 'job_' + result.jobId);
  await q('INSERT INTO payments(job_post_id,gateway_order_id,amount_paise) VALUES($1,$2,$3)', [result.jobId, order.id, f.totalPaise]);
  return Response.json({ jobId: result.jobId, orderId: order.id, amount: f.totalPaise, keyId: process.env.RAZORPAY_KEY_ID });
}
