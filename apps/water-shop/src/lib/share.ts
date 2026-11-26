/** Native share (Android share sheet → WhatsApp etc.), with WhatsApp-link and clipboard fallbacks. No paid API. */
export async function shareText(text: string, title = 'إدارة محل المياه'): Promise<'shared' | 'whatsapp' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(wa, '_blank', 'noopener');
  if (win) return 'whatsapp';
  await navigator.clipboard?.writeText(text);
  return 'copied';
}

/** wa.me link to a specific Libyan number (adds 218 if local format like 091xxxxxxx). */
export function whatsappTo(phone: string, text: string): string {
  let p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '218' + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
