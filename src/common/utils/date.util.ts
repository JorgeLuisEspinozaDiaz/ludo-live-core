import { Transform } from 'class-transformer';

/** Perú no usa DST: UTC−5 todo el año */
export const APP_TIMEZONE = process.env.APP_TZ || 'America/Lima';
export const LIMA_OFFSET = '-05:00';

function hasTimezone(value: string): boolean {
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(value.trim());
}

/**
 * Formatea un Date a hora de pared en Lima: `YYYY-MM-DDTHH:mm:ss`
 * (sin Z; listo para datetime-local del FE).
 */
export function formatLimaDateTime(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  // en-CA da YYYY-MM-DD; hora puede venir como "24" en algunos engines → normalizar
  let hour = get('hour');
  if (hour === '24') hour = '00';

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`;
}

/**
 * Interpreta datetime sin offset como hora de Lima (no como UTC del servidor).
 * Con Z/offset, respeta el instante absoluto.
 */
export function parseFlexibleDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== 'string') return null;

  const v = value.trim();

  // DD/MM/YYYY o DD-MM-YYYY [HH:mm[:ss]] → Lima
  const dmy = v.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const hour = Number(dmy[4] ?? 0);
    const minute = Number(dmy[5] ?? 0);
    const second = Number(dmy[6] ?? 0);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const isoLocal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${LIMA_OFFSET}`;
    const d = new Date(isoLocal);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // YYYY-MM-DD o YYYY-MM-DDTHH:mm[:ss][.sss]
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    let normalized = v.includes('T') || v.includes(' ') ? v.replace(' ', 'T') : `${v}T00:00:00`;
    // quitar milisegundos sueltos antes de pegar offset
    if (!hasTimezone(normalized)) {
      normalized = normalized.replace(/\.\d+$/, '') + LIMA_OFFSET;
    }
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Date real (UTC interno) a partir del string flexible en Lima */
export function parseToDate(value: unknown): Date | null {
  const iso = parseFlexibleDateTime(value);
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ToIsoDateTime() {
  return Transform(({ value }) => {
    const parsed = parseFlexibleDateTime(value);
    return parsed ?? value;
  });
}
