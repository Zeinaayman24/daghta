import { isEn, t } from '@/lib/i18n';
/**
 * The one formatter. Every number, date, phone and code on a screen goes through here, so the rules live in one place:
 *   Arabic UI: Arabic-Indic digits for prices, counts, dates, measurements and percentages.
 *   Always Latin: model years, phone numbers, order and request numbers, handover and OTP codes, VINs.
 *   English UI: Latin everywhere.
 * Latin fragments inside Arabic text are wrapped in a first-strong isolate so the punctuation around them stays put.
 */
const AD = '٠١٢٣٤٥٦٧٨٩';
const FSI = '⁨', PDI = '⁩', LRI = '⁦';

/** Digits as the reader expects them: Arabic-Indic in Arabic, 0-9 in English. */
export const digits = (v: string | number | null | undefined) => (v == null ? '' : isEn() ? String(v) : String(v).replace(/\d/g, (d) => AD[Number(d)]));
/** 0-9 from Arabic-Indic digits typed on Arabic keyboards. */
export const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AD.indexOf(d)));

/** Isolate a run of text so bidi punctuation around it stays in place (model names, codes, URLs, brand names). */
export const isolate = (s: string) => (s ? FSI + s + PDI : s);
/** Force a run to read left to right whatever the UI direction (phones, codes, VINs). */
export const ltr = (s: string) => (s ? LRI + s + PDI : s);

/** An amount without the currency: "١٢٬١٥٠" / "12,150". */
export const amount = (n: number | string | null | undefined) => {
  const v = Math.round(Number(n) || 0);
  return isEn() ? v.toLocaleString('en-US') : digits(v.toLocaleString('en-US')).replace(/,/g, '٬');
};
/** An amount with the currency after it: "٨٥٠ ج.م" / "850 EGP". */
export const money = (n: number | string | null | undefined) => `${amount(n)} ${t('ج.م')}`;
/** A plain count or measurement: offers, km, minutes. */
export const count = (n: number | string | null | undefined) => digits(n);
/** Kilometres: "٢٫٤ كم" / "2.4 km". */
export const km = (n: number) => `${digits(n.toFixed(n < 10 ? 1 : 0)).replace('.', isEn() ? '.' : '٫')} ${t('كم')}`;
/** Percent: "٨٢٪" / "82%". */
export const pct = (n: number) => (isEn() ? `${Math.round(n)}%` : `${digits(Math.round(n))}٪`);

/** A model year is part of the model name, like a plate: Latin always. */
export const year = (y: number | string | null | undefined) => (y ? isolate(String(y)) : '');
/** Phone numbers: Latin, grouped, left to right so they never reverse. "0101 234 5678". */
export const phone = (p: string | null | undefined) => {
  const d = toLatin(String(p ?? '')).replace(/\D/g, '');
  const g = d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d.replace(/(\d{4})(?=\d)/g, '$1 ');
  return g ? ltr(g) : '';
};
/** Order and request numbers: people read them out to couriers, so Latin: "#5001". */
export const id = (n: number | string | null | undefined) => (n == null || n === '' ? '' : isolate('#' + toLatin(String(n))));
/** Handover and OTP codes: Latin, spaced, left to right. "48 31". */
export const code = (c: string | number | null | undefined) => {
  const s = toLatin(String(c ?? '')).replace(/\s/g, '');
  return s ? ltr(s.length === 4 ? `${s.slice(0, 2)} ${s.slice(2)}` : s) : '';
};
/** VIN / chassis: Latin, upper case, left to right. */
export const vin = (v: string | null | undefined) => (v ? ltr(toLatin(v).toUpperCase()) : '');

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AR_DAYS = ['الحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toDate = (d: string | number | Date) => (d instanceof Date ? d : new Date(d));

/** "التلات ٢٥ نوفمبر" / "Tue 25 Nov" — month names in words, never 25/11. */
export const date = (d: string | number | Date, withDay = true) => {
  const x = toDate(d); if (isNaN(x.getTime())) return '';
  const day = isEn() ? EN_DAYS[x.getDay()] : AR_DAYS[x.getDay()];
  const month = isEn() ? EN_MONTHS[x.getMonth()] : AR_MONTHS[x.getMonth()];
  const sameYear = x.getFullYear() === new Date().getFullYear();
  const core = `${digits(x.getDate())} ${month}${sameYear ? '' : ' ' + digits(x.getFullYear())}`;
  return withDay ? `${day} ${core}` : core;
};
/** "٨:٣٠ م" / "8:30 pm". */
export const time = (d: string | number | Date) => {
  const x = toDate(d); if (isNaN(x.getTime())) return '';
  const h = x.getHours(), m = x.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return isEn() ? `${h12}:${mm} ${h < 12 ? 'am' : 'pm'}` : `${digits(h12)}:${digits(mm)} ${h < 12 ? 'ص' : 'م'}`;
};
export const dateTime = (d: string | number | Date) => `${date(d)} · ${time(d)}`;
/** "من ٥ دقايق" / "5 min ago"; stops at yesterday and then shows the date. */
export const rel = (iso: string | number | Date, now = Date.now()) => {
  const x = toDate(iso); if (isNaN(x.getTime())) return '';
  const m = Math.max(1, Math.round((now - x.getTime()) / 60000));
  if (m < 60) return t('من {0} دقيقة', digits(m));
  const h = Math.round(m / 60);
  if (h < 24) return t('من {0} ساعة', digits(h));
  const dd = Math.round(h / 24);
  if (dd === 1) return t('إمبارح');
  return date(x);
};

export const fmt = { digits, toLatin, isolate, ltr, amount, money, count, km, pct, year, phone, id, code, vin, date, time, dateTime, rel };
export default fmt;
