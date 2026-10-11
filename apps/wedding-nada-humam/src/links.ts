import { wedding } from './config.ts';

/** Shared by the page and the build (vite.config.ts), so no DOM here. */

const start = new Date(wedding.startsAt);
const end = new Date(start.getTime() + wedding.durationHours * 3600_000);
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const eventTitle = `حفل زفاف ${wedding.bride.first} و${wedding.groom.first}`;
export const eventPlace = `${wedding.venue.name}، ${wedding.venue.area}`;
const details = `بحضوركم تكتمل فرحتنا.\nالموقع على الخريطة: ${wedding.venue.mapsUrl}`;

export const googleCalendarUrl =
  'https://calendar.google.com/calendar/render?' +
  new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle,
    dates: `${stamp(start)}/${stamp(end)}`,
    details,
    location: eventPlace,
    ctz: 'Africa/Tripoli',
  }).toString();

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** RFC 5545 folding: lines ≤ 75 octets, never splitting a UTF-8 character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length ? 74 : 75; // continuation lines start with a space
    if (bytes + n > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

export function buildIcs(): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//wedding-invitation//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${stamp(start)}-wedding-invitation`,
    `DTSTAMP:${stamp(start)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsText(eventTitle)}`,
    `LOCATION:${icsText(eventPlace)}`,
    `DESCRIPTION:${icsText(details)}`,
    `URL:${wedding.venue.mapsUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(`غدًا ${eventTitle}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
