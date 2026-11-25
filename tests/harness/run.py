"""Daghta screen harness.

Usage:
  python3 tests/harness/run.py snapshot <base_url> <out_dir> [phone|desktop]
      Opens every screen (customer, shop, public) in Arabic and English,
      records the backend calls each screen makes (into <out_dir>/calls.json)
      and saves a screenshot per screen. Runs against the mock backend only.
  python3 tests/harness/run.py compare <baseline_calls.json> <new_calls.json>
      Fails (exit 1) when a screen asks the backend for something different.
"""
import asyncio, json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
import mock

CUST = [('home', '/customer'), ('new', '/customer/new'), ('requests', '/customer/requests'), ('request', '/customer/r4'),
        ('order', '/order/o1'), ('chat', '/chat/r4/' + mock.SHOP2), ('shops', '/shops'), ('shopprofile', '/shop-profile/' + mock.SHOP2),
        ('install_new', '/install/new'), ('install', '/install/ir1'), ('booking', '/booking/bk1'), ('messages', '/messages'),
        ('notifications', '/notifications'), ('account', '/account'), ('profile', '/profile'), ('cars', '/cars'),
        ('favorites', '/favorites'), ('assistant', '/assistant'), ('support', '/support'), ('privacy', '/privacy'), ('legal', '/legal/terms')]
SHOP = [('s_home', '/shop'), ('s_request', '/shop/r4'), ('s_order', '/shop/order/o1'), ('s_install', '/shop/install/ir1'),
        ('s_booking', '/shop/booking/bk1'), ('s_balance', '/shop/balance'), ('s_perf', '/shop/performance'), ('s_services', '/shop/services'),
        ('s_setup', '/shop-setup'), ('s_messages', '/messages'), ('s_account', '/account')]
PUB = [('welcome', '/welcome'), ('login', '/login')]

SESSION_KEY = 'sb-ztnbyvfupadzhddnbdje-auth-token'

def session():
    return {'access_token': 'x', 'refresh_token': 'y', 'expires_at': int(time.time()) + 3600, 'expires_in': 3600,
            'token_type': 'bearer', 'user': {'id': mock.UID, 'aud': 'authenticated', 'email': 'a@b.c'}}

def call_key(c):
    return f"{c.get('m')} {c.get('kind')}:{c.get('name')} [{' '.join(c.get('filters', []))}] body={','.join(c.get('body', []))}"

async def snapshot(base, out, size):
    os.makedirs(out, exist_ok=True)
    vp = {'width': 390, 'height': 844} if size == 'phone' else {'width': 1280, 'height': 820}
    result = {}
    errors = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for lang in ('ar', 'en'):
            for role, pages in (('cust', CUST), ('shop', SHOP), ('pub', PUB)):
                mock.profile['is_shop'] = role == 'shop'; mock.profile['is_customer'] = role != 'shop'
                ctx = await b.new_context(viewport=vp, device_scale_factor=2 if size == 'phone' else 1)
                if role != 'pub':
                    await ctx.add_init_script(f"localStorage.setItem('{SESSION_KEY}', {json.dumps(json.dumps(session()))});")
                await ctx.add_init_script(f"localStorage.setItem('daghta-intro-seen','1'); localStorage.setItem('daghta-greet','0'); localStorage.setItem('daghta-lang','{lang}'); localStorage.setItem('daghta-near-loc', JSON.stringify({{lat:30.06,lng:31.24}}))")
                await ctx.route('**/*supabase.co/**', mock.handle)
                await ctx.route('**/tile.openstreetmap.org/**', lambda r: r.abort())
                for name, path in pages:
                    pg = await ctx.new_page(); errs = []
                    pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
                    pg.on('console', lambda m, errs=errs: errs.append('console:' + m.text) if m.type == 'error' else None)
                    mock.CALLS.clear()
                    try:
                        await pg.goto(base + path, wait_until='networkidle', timeout=25000)
                    except Exception as e:
                        errs.append('nav:' + str(e)[:80])
                    await pg.wait_for_timeout(1800)
                    await pg.screenshot(path=f'{out}/{size}_{lang}_{name}.png', full_page=(size != 'phone'))
                    key = f'{lang}/{name}'
                    result[key] = sorted(set(call_key(c) for c in mock.CALLS if 'err' not in c))
                    if errs: errors[key] = errs[:3]
                    await pg.close()
                await ctx.close()
        await b.close()
    json.dump(result, open(f'{out}/calls.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(errors, open(f'{out}/errors.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{len(result)} screens, {len(errors)} with errors -> {out}')
    for k, v in errors.items(): print(' ', k, v)

def compare(a_path, b_path):
    a = json.load(open(a_path)); b = json.load(open(b_path))
    bad = 0
    for k in sorted(set(a) | set(b)):
        sa, sb = set(a.get(k, [])), set(b.get(k, []))
        if sa != sb:
            bad += 1
            print('DIFF', k)
            for x in sorted(sa - sb): print('   missing:', x)
            for x in sorted(sb - sa): print('   extra:  ', x)
    print(f'{len(a)} screens compared, {bad} differ')
    return bad

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'snapshot':
        asyncio.run(snapshot(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else 'phone'))
    elif cmd == 'compare':
        sys.exit(1 if compare(sys.argv[2], sys.argv[3]) else 0)
