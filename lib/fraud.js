const RULES = [
  [/regist?ration|security|deposit|advance|joining\s*fee|processing\s*fee/i, 'asks applicants to pay money'],
  [/\botp\b|send\s*money|transfer|upi\s*id|bank\s*details/i, 'asks for OTPs or money transfers'],
  [/earn\s*(daily|per\s*day|₹?\s*\d)|guaranteed\s*(income|job)|no\s*interview|work\s*from\s*home|easy\s*money/i, 'uses typical scam wording'],
];
export function validate(d) {
  const e = [], s = k => String(d[k] || '').trim();
  if (s('business_name').length < 2) e.push('business_name');
  if (s('address').length < 6) e.push('address');
  if (s('city').length < 2) e.push('city');
  if (s('title').length < 3) e.push('title');
  if (!(+d.vacancies >= 1 && +d.vacancies <= 500)) e.push('vacancies');
  if (s('salary_text').length < 3) e.push('salary_text');
  if (!/^[6-9]\d{9}$/.test(s('contact_mobile'))) e.push('contact_mobile');
  if (d.whatsapp_mobile && !/^[6-9]\d{9}$/.test(s('whatsapp_mobile'))) e.push('whatsapp_mobile');
  if (s('contact_email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s('contact_email'))) e.push('contact_email');
  return e;
}
export function scan(d) {
  const t = ['title', 'description', 'business_name', 'work_timings', 'salary_text'].map(k => d[k] || '').join(' ');
  for (const [re, why] of RULES) if (re.test(t)) return { blocked: 'Listing blocked: it ' + why + '. Applicants must never be asked to pay.' };
  return { risk: /https?:\/\/|www\.|t\.me\//i.test(t) }; // links go to review after payment
}
