const auth = () => 'Basic ' + Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
async function call(path, body) {
  const r = await fetch('https://api.razorpay.com/v1' + path, { method: 'POST', headers: { Authorization: auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.description || 'Razorpay error'); return j;
}
export const createOrder = (amount, receipt) => call('/orders', { amount, currency: 'INR', receipt, payment_capture: 1 });
export const refund = (paymentId, amount) => call(`/payments/${paymentId}/refund`, { amount });
