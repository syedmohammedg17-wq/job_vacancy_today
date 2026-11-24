import { q } from '@/lib/db'; import { safeEq, bad } from '@/lib/security'; import { sendReminder } from '@/lib/sms';
export async function GET(req) {
  if (!safeEq(req.headers.get('authorization') || '', 'Bearer ' + process.env.CRON_SECRET)) return bad('Unauthorized', 401);
  const exp = await q("UPDATE job_posts SET status='expired' WHERE status='published' AND expires_at<=now()");
  const soon = await q("UPDATE job_posts SET reminder_sent=true WHERE status='published' AND NOT reminder_sent AND duration_days>=7 AND expires_at<=now()+interval '24 hours' RETURNING contact_mobile,title");
  for (const j of soon.rows) await sendReminder(j.contact_mobile, j.title).catch(() => {});
  await q("DELETE FROM otp_requests WHERE created_at<now()-interval '1 day'");
  await q("DELETE FROM job_posts WHERE status='draft' AND created_at<now()-interval '2 days' AND NOT EXISTS (SELECT 1 FROM payments WHERE job_post_id=job_posts.id)");
  return Response.json({ expired: exp.rowCount, reminded: soon.rowCount });
}
