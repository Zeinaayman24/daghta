/**
 * Demo mode: the preview build runs against this in-browser stand-in for the backend. No network, no production
 * data, nothing persists past a reload. It is the same sample data the test harness uses, so what you see in the
 * preview is what the regression run saw. Switched on with EXPO_PUBLIC_DEMO=1 at build time; never in production.
 */
import raw from './demo-data.json';

export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
export const DEMO_UID: string = (raw as any).UID;

type Row = Record<string, any>;
const now = Date.now();
/** The dataset stores times as minutes ago, so the demo reads "من ٥ دقايق" whenever it is opened. */
const hydrate = (v: any): any => {
  if (Array.isArray(v)) return v.map(hydrate);
  if (v && typeof v === 'object') {
    if ('$min' in v && Object.keys(v).length === 1) return new Date(now - v.$min * 60000).toISOString();
    const o: Row = {}; for (const k in v) o[k] = hydrate(v[k]); return o;
  }
  return v;
};
const data = hydrate(raw) as { UID: string; SHOP2: string; tables: Record<string, Row[]>; near: Row[]; reviews: Row[]; people: Row[]; rpc: Record<string, any> };
const tables = data.tables;

/** Which side the demo shows: the same sample account is a customer and a shop; the ribbon switches. */
export function demoRole(): 'customer' | 'shop' {
  try { return localStorage.getItem('daghta-demo-role') === 'shop' ? 'shop' : 'customer'; } catch { return 'customer'; }
}
export function setDemoRole(r: 'customer' | 'shop') { try { localStorage.setItem('daghta-demo-role', r); } catch { /* fine */ } }
const applyRole = () => { const p = tables.profiles[0]; const shop = demoRole() === 'shop'; p.is_shop = shop; p.is_customer = !shop; };

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
const json = (body: any, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

/** PostgREST filters the app uses: eq, neq, in, is, gt/gte/lt/lte, like (ignored), order, limit, offset. */
function filter(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  params.forEach((v, k) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) return;
    const dot = v.indexOf('.'); if (dot < 0) return;
    const op = v.slice(0, dot), val = v.slice(dot + 1);
    const get = (r: Row) => r[k];
    if (op === 'eq') out = out.filter((r) => String(get(r)) === val);
    else if (op === 'neq') out = out.filter((r) => String(get(r)) !== val);
    else if (op === 'in') { const vals = val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')); out = out.filter((r) => vals.includes(String(get(r)))); }
    else if (op === 'is') out = out.filter((r) => (val === 'null' ? get(r) == null : val === 'true' ? get(r) === true : get(r) === false));
    else if (op === 'gt') out = out.filter((r) => get(r) > val); else if (op === 'gte') out = out.filter((r) => get(r) >= val);
    else if (op === 'lt') out = out.filter((r) => get(r) < val); else if (op === 'lte') out = out.filter((r) => get(r) <= val);
    else if (op === 'not') { /* not.like etc: ignored, as the harness does */ }
  });
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  const offset = Number(params.get('offset') || 0), limit = params.get('limit');
  if (offset) out = out.slice(offset);
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

const session = () => ({ access_token: 'demo', refresh_token: 'demo', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user });
const user = { id: data.UID, aud: 'authenticated', role: 'authenticated', email: 'demo@daghta.app', app_metadata: {}, user_metadata: {}, created_at: new Date(now - 86400000 * 40).toISOString() };

/** The fetch the Supabase client uses in demo mode. */
export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? {});
  const body = init?.body ? safeJson(String(init.body)) : null;
  const path = url.pathname;
  applyRole();

  // auth
  if (path.includes('/auth/v1/')) {
    if (path.endsWith('/user')) return json(user);
    if (path.endsWith('/token')) return json(session());
    if (path.endsWith('/logout')) return json(undefined, 204);
    return json({});
  }
  if (path.includes('/functions/v1/')) return json({ configured: false });
  if (path.includes('/storage/v1/')) return json({ Key: 'demo' });

  // rpc
  const rpc = path.match(/\/rest\/v1\/rpc\/([a-z_]+)/);
  if (rpc) {
    const name = rpc[1];
    if (name === 'my_shop') { const me = tables.shops.find((s) => s.id === data.UID); const n = data.near.find((x) => x.id === data.UID); return json(me ? { ...me, ...n, accepting: true, status: 'approved' } : null); }
    if (name === 'shops_near') { const sid = body?.p_shop; return json(data.near.filter((s) => !sid || s.id === sid)); }
    if (name === 'shop_reviews') return json(data.reviews);
    if (name === 'booking_people') return json(data.people);
    if (name === 's_balance' || name === 'shop_statements') return json({ statements: [], owed: 0, paid: 0 });
    if (name in data.rpc) return json(data.rpc[name]);
    return json(null);
  }

  // tables
  const tm = path.match(/\/rest\/v1\/([a-z_]+)/);
  if (tm) {
    const name = tm[1];
    tables[name] ??= [];
    const rows = tables[name];
    const wantsOne = (headers.get('accept') ?? '').includes('vnd.pgrst.object');
    const prefer = headers.get('prefer') ?? '';
    if (method === 'GET' || method === 'HEAD') {
      const out = filter(rows, url.searchParams);
      const range = { 'content-range': `0-${Math.max(0, out.length - 1)}/${out.length}` };
      if (method === 'HEAD' || prefer.includes('count=exact') && url.searchParams.get('select') === 'id' && headers.get('range')?.startsWith('0-0')) return json(prefer.includes('head') ? undefined : out, 200, range);
      return json(wantsOne ? out[0] ?? null : out, 200, range);
    }
    if (method === 'POST') {
      const list = (Array.isArray(body) ? body : [body ?? {}]).map((r: Row) => ({ id: uuid(), created_at: new Date().toISOString(), ...r }));
      if (prefer.includes('resolution=merge-duplicates')) {
        for (const r of list) { const i = rows.findIndex((x) => x.id === r.id); if (i >= 0) rows[i] = { ...rows[i], ...r }; else rows.push(r); }
      } else rows.push(...list);
      return json(prefer.includes('return=representation') ? (wantsOne ? list[0] : list) : undefined, 201);
    }
    if (method === 'PATCH') {
      const hit = filter(rows, url.searchParams);
      hit.forEach((r) => Object.assign(r, body ?? {}));
      return json(prefer.includes('return=representation') ? (wantsOne ? hit[0] ?? null : hit) : undefined);
    }
    if (method === 'DELETE') {
      const hit = new Set(filter(rows, url.searchParams));
      tables[name] = rows.filter((r) => !hit.has(r));
      return json(prefer.includes('return=representation') ? [...hit] : undefined);
    }
  }
  return json({});
}
const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

/** Seeds the signed-in session the way the browser would hold it, so the app opens signed in. */
export function seedDemoSession(storageKey: string) {
  try { if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(session())); } catch { /* fine */ }
}
/** A WebSocket that never connects: realtime is off in the demo and the app simply polls. */
export class NoSocket {
  readyState = 3; onopen: any; onclose: any; onerror: any; onmessage: any; url: string;
  constructor(url: string) { this.url = url; setTimeout(() => this.onclose?.({ code: 1000, reason: 'demo', wasClean: true }), 0); }
  send() {} close() {} addEventListener() {} removeEventListener() {}
}
