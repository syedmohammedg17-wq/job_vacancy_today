// The server is the only place the fee is calculated. The browser total is for display only.
export const PRICE = { 7: 99, 15: 149, 30: 249 };
export const FEATURED = 100, AGREEMENT_VERSION = '2026-11-v1';
export function fee(days, featured) {
  const base = PRICE[days]; if (!base) throw new Error('Invalid duration');
  const b = base + (featured ? FEATURED : 0);
  return { base: b, totalPaise: b * 118 }; // price + 18% GST, in paise
}
