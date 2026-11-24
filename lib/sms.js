// MSG91 OTP API. India requires a DLT-registered sender and template. Check the endpoint against MSG91's current docs.
export async function sendOtp(phone, code) {
  const authkey = process.env.MSG91_AUTHKEY, templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  if (!authkey || !templateId) {
    if (process.env.NODE_ENV === 'production') throw new Error('MSG91 auth key and OTP template ID are required');
    console.log('Development OTP:', code);
    return { developmentCode: code };
  }
  const u = new URL('https://control.msg91.com/api/v5/otp');
  u.search = new URLSearchParams({ template_id: templateId, mobile: '91' + phone, otp: code });
  const r = await fetch(u, { method: 'POST', headers: { authkey, 'content-type': 'application/json' }, body: JSON.stringify({}) });
  const result = await r.json().catch(() => null);
  if (!r.ok || result?.type !== 'success') throw new Error(`MSG91 rejected OTP request (HTTP ${r.status})`);
  return {};
}
// Reminder SMS also needs a DLT template. Wire it to your provider the same way.
export async function sendReminder(phone, title) { console.log('Reminder to', phone, 'for', title); }
