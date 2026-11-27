import QRCode from 'qrcode';
import type { ClinicSettings } from '../types/clinic';

/** Basic shape check for a UPI ID like clinic@okicici. */
export function isValidUpiId(id: string | undefined): id is string {
  return Boolean(id && /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(id.trim()));
}

/** upi:// payment link understood by GPay, PhonePe, Paytm and BHIM. */
export function buildUpiLink(settings: ClinicSettings, amount: number, note: string): string | null {
  if (!isValidUpiId(settings.upiId) || amount <= 0) return null;
  const params = new URLSearchParams({
    pa: settings.upiId.trim(),
    pn: settings.centerName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
}

/** Renders a QR code as an SVG string, synchronously (usable in print templates). */
export function qrSvg(text: string, sizePx: number): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const quiet = 2;
  const total = n + quiet * 2;
  let path = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
