import { q } from '@/lib/db';
// The phone number is never in this list. It is released only by the contact route.
export async function GET(req) {
  const u = new URL(req.url), qs = u.searchParams.get('q') || '', type = u.searchParams.get('type') || '';
  const { rows } = await q(`SELECT id,title,business_name,business_type,city,locality,vacancies,salary_text,work_timings,description,featured,expires_at
    FROM job_posts WHERE status='published' AND expires_at>now()
    AND ($1='' OR business_type=$1) AND ($2='' OR (title||' '||business_name||' '||city||' '||locality) ILIKE '%'||$2||'%')
    ORDER BY featured DESC, published_at DESC LIMIT 50`, [type, qs]);
  return Response.json(rows, { headers: { 'Cache-Control': 's-maxage=30' } });
}
