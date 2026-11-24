// MSG91 OTP API. India requires a DLT-registered sender and template. Check the endpoint against MSG91's current docs.
export async function sendOtp(phone, code) {
  if (!process.env.MSG91_AUTHKEY) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMS OTP delivery is not configured');
    console.log('Development OTP:', code);
    return { developmentCode: code };
  }
  const u = new URL('https://control.msg91.com/api/v5/otp');
  u.search = new URLSearchParams({ authkey: process.env.MSG91_AUTHKEY, template_id: process.env.MSG91_OTP_TEMPLATE_ID, mobile: '91' + phone, otp: code });
  const r = await fetch(u, { method: 'POST' }); if (!r.ok) throw new Error('SMS failed');
  return {};
}
// Reminder SMS also needs a DLT template. Wire it to your provider the same way.
export async function sendReminder(phone, title) { console.log('Reminder to', phone, 'for', title); }
