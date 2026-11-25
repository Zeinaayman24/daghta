# Mock Supabase backend for the Playwright harness. No network, no production data.
import asyncio, json, time, re, sys

UID='11111111-1111-4111-8111-111111111111'; SHOP2='22222222-2222-4222-8222-222222222222'
now=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
ago=lambda m: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time()-m*60))
profile={'id':UID,'full_name':'أحمد','phone':'01012345678','area':'مدينة نصر','car_make':'هيونداي','car_model':'فيرنا','car_year':2014,'is_customer':True,'is_shop':False,'is_admin':True,'car_vin':'KMHCT41DAEU123456','email':'ahmed@example.com','country':'مصر','governorate':'القاهرة','street':'شارع عباس العقاد','building':'12','floor':'3','apartment':'8','landmark':'جنب صيدلية العزبي','postal_code':'11371'}
shops=[{'id':UID,'area':'التوفيقية','brands':['هيونداي','كيا'],'status':'approved','created_at':ago(900),'governorate':'القاهرة','shop_type':'both','specialties':['ميكانيكا','كهرباء'],'offers_delivery':True,'fee_area':40,'fee_city':70,'fee_far':150},{'id':SHOP2,'area':'السبتية','brands':['نيسان'],'status':'approved','created_at':ago(30),'governorate':'القاهرة','shop_type':'used','specialties':['صاج وبودي','فوانيس ومرايات'],'offers_delivery':False,'featured_until':'2027-01-01T00:00:00Z'}]
priv=[{'id':UID,'name':'النور لقطع الغيار','owner_name':'أحمد محمد','phone':'01012345678','phone2':'','street':'شارع التوفيقية','building':'5','landmark':'','postal_code':'11511','commercial_register':'12345','instapay_address':'','wallet_number':''},{'id':SHOP2,'name':'تشليح الأمانة','owner_name':'سيد محمود حسن','phone':'01198765432','phone2':'01234567890','street':'شارع السبتية','building':'40','landmark':'قصاد البنزينة','postal_code':'','commercial_register':'','instapay_address':'amana@instapay','wallet_number':'01198765432'}]
R=lambda i,n,part,st,m,cust=UID,make='هيونداي',model='فيرنا',cq=None: {'id':i,'num':n,'customer_id':cust,'part':part,'car_make':make,'car_model':model,'car_year':2014,'wanted_condition':'used','area':'مدينة نصر','notes':'الجنب اليمين' if n==104 else '','photo_path':None,'status':st,'chosen_quote_id':cq,'delivery_mode':'delivery' if cq else None,'rating':None,'created_at':ago(m),'vin':'','side':'right' if n==104 else '','urgency':'today' if n==104 else 'normal','budget':1200 if n==104 else None,'order_status':'out_for_delivery' if cq=='q3' else None,'review':'','batch_id':'b1' if n in (104,106,107) else None,'qty':1,'order_id':'o1' if n==103 else None}
reqs=[R('r4',104,'فانوس أمامي يمين','open',8),R('r6',106,'مراية جانبية شمال','open',8),R('r7',107,'رفرف','open',8),R('r3',103,'مراية جانبية شمال','chosen',300,cq='q3'),R('r2',102,'رديتر مياه','open',22,cust='c2',make='هيونداي',model='سنترا'),R('r8',108,'تيل فرامل','open',3,cust='c2'),R('r1',101,'طقم دبرياج','done',4000,cq='q1')]
quotes=[{'id':'qc','request_id':'r6','shop_id':SHOP2,'price':400,'condition':'used_clean','warranty_days':7,'photo_path':None,'created_at':ago(4)},{'id':'qa','request_id':'r4','shop_id':SHOP2,'price':850,'condition':'used_original','warranty_days':7,'photo_path':None,'created_at':ago(5)},{'id':'qb','request_id':'r4','shop_id':UID,'price':1150,'condition':'used_clean','warranty_days':14,'photo_path':None,'created_at':ago(3),'brand':'أصلي هيونداي','note':'فرز أول، متجرب'},{'id':'qd','request_id':'r4','shop_id':UID,'price':650,'condition':'new_aftermarket','warranty_days':0,'photo_path':None,'created_at':ago(2),'brand':'TYC تايواني','note':''},{'id':'q3','request_id':'r3','shop_id':SHOP2,'price':650,'condition':'used_original','warranty_days':7,'photo_path':None,'created_at':ago(200)},{'id':'q1','request_id':'r1','shop_id':SHOP2,'price':2100,'condition':'new_aftermarket','warranty_days':30,'photo_path':None,'created_at':ago(3900)}]
msgs=[{'id':'m0','request_id':'r4','shop_id':SHOP2,'sender_id':SHOP2,'body':'كلمني على ••• أسهل','photo_path':None,'flagged':True,'created_at':ago(7)},{'id':'m1','request_id':'r4','shop_id':SHOP2,'sender_id':SHOP2,'body':'القطعة أصلي ومتجربة، عايز صورة للعربية من قدام؟','photo_path':None,'created_at':ago(6)},{'id':'m2','request_id':'r4','shop_id':SHOP2,'sender_id':UID,'body':'أيوه هبعتهالك دلوقتي','photo_path':None,'created_at':ago(5)},{'id':'m3','request_id':'r4','shop_id':SHOP2,'sender_id':SHOP2,'body':'تمام، دي هي بالظبط ومعاها ضمان ٧ أيام','photo_path':None,'created_at':ago(4)}]
notifs=[{'id':'n1','user_id':UID,'title':'وصلك عرض جديد','body':'فانوس أمامي يمين · 1150 ج.م','link':'/customer/r4','read_at':None,'created_at':ago(3)},{'id':'n2','user_id':UID,'title':'رسالة من المحل','body':'تمام، دي هي بالظبط','link':'/chat/r4/'+SHOP2,'read_at':None,'created_at':ago(4)},{'id':'n3','user_id':UID,'title':'طلبك خرج للتوصيل','body':'مراية جانبية شمال','link':'/customer/r3','read_at':ago(60),'created_at':ago(90)}]
reports=[{'id':'rp1','reporter_id':UID,'request_id':'r3','category':'order','body':'المندوب اتأخر ساعتين عن المعاد','status':'open','admin_reply':'','created_at':ago(30),'resolved_at':None}]
cars=[{'id':'car2','owner_id':UID,'make':'كيا','model':'سيراتو','year':2018,'vin':'','created_at':ago(100)}]
orders=[{'id':'o4','order_no':5004,'customer_id':'c2','shop_id':UID,'delivery_mode':'delivery','status':'ready','items_total':1150,'delivery_fee':70,'rating':None,'review':'','created_at':ago(60),'updated_at':ago(10),'received_at':None,'payment_method':'cash','payment_status':'unpaid','payment_ref':'','payment_proof':None,'payment_note':'','paid_at':None},{'id':'o3','order_no':5003,'customer_id':'c2','shop_id':UID,'delivery_mode':'pickup','status':'preparing','items_total':1150,'delivery_fee':0,'rating':None,'review':'','created_at':ago(15),'updated_at':ago(3),'received_at':None,'payment_method':'instapay','payment_status':'review','payment_ref':'IP-77812','payment_proof':None,'payment_note':'','paid_at':None},{'id':'o1','order_no':5001,'customer_id':UID,'shop_id':SHOP2,'delivery_mode':'delivery','status':'ready','items_total':650,'delivery_fee':60,'rating':None,'review':'','created_at':ago(300),'updated_at':ago(20),'received_at':None,'payment_method':'cash','payment_status':'unpaid','payment_ref':'','payment_proof':None,'payment_note':'','paid_at':None},{'id':'o2','order_no':5002,'customer_id':UID,'shop_id':SHOP2,'delivery_mode':'delivery','status':'preparing','items_total':850,'delivery_fee':60,'rating':None,'review':'','created_at':ago(5),'updated_at':ago(5),'received_at':None,'payment_method':'instapay','payment_status':'awaiting','payment_ref':'','payment_proof':None,'payment_note':'','paid_at':None}]
tables={'ads':[{'id':'ad1','title':'خصم ٢٠٪ على تغيير الزيت','subtitle':'مركز صيانة معتمد في مدينة نصر، احجز من التطبيق','image_path':None,'link':'https://example.com','advertiser':'أويل بوينت','active':True,'starts_at':ago(100),'ends_at':None,'sort':0,'views':0,'clicks':0},{'id':'ad2','title':'كاوتش جديد بالتقسيط','subtitle':'','image_path':None,'link':'','advertiser':'تاير هاوس','active':True,'starts_at':ago(100),'ends_at':None,'sort':1,'views':0,'clicks':0}],'order_codes':[{'order_id':'o1','code':'4821'}],'app_settings':[{'key':'instapay_address','value':'daghta@instapay'},{'key':'wallet_number','value':'01000000000'},{'key':'account_name','value':'ضغطة لتجارة قطع الغيار'},{'key':'payment_note','value':'اكتب رقم الأوردر في ملاحظة التحويل'}],'orders':orders,'profiles':[profile],'messages':msgs,'notifications':notifs,'reports':reports,'cars':cars,'favorites':[{'customer_id':UID,'shop_id':SHOP2}],'shops':shops,'shop_private':priv,'requests':reqs,'quotes':quotes,'declines':[]}
def filt(rows,url):
    q=dict(re.findall(r'[?&]([a-z_]+)=([^&]*)',url))
    from urllib.parse import unquote
    out=rows
    for k,v in q.items():
        v=unquote(v)
        if v.startswith('eq.'): out=[r for r in out if str(r.get(k))==v[3:]]
        if v.startswith('in.('): vals=v[4:-1].split(','); out=[r for r in out if str(r.get(k)) in vals]
    return out
async def handle(route):
    req=route.request; url=req.url
    if '/rpc/decline_counts' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps([{'request_id':'r7','n':1,'reasons':['مش متوفرة دلوقتي']}]))
    if '/rpc/shop_cards' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps([{'id':SHOP2,'name':'تشليح الأمانة','area':'السبتية','rating':4.5,'ratings':21,'sales':37,'reply_min':12},{'id':UID,'name':'النور لقطع الغيار','area':'التوفيقية','rating':4.8,'ratings':9,'sales':14,'reply_min':4}]))
    if '/rpc/delivery_options' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps([{'quote_id':'qa','fee':None},{'quote_id':'qb','fee':70},{'quote_id':'qd','fee':150},{'quote_id':'qc','fee':None}]))
    if '/rpc/my_balance' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'mode':'free','pct':5,'limit':500,'fees':143,'paid':0,'owed':0,
          'statements':[{'month':'2026-10','amount':143}],'orders':[{'id':'o9','order_no':5009,'at':ago(60*26),'total':1650,'fee':83,'parts':'فانوس أمامي يمين'},{'id':'o8','order_no':5006,'at':ago(60*72),'total':1200,'fee':60,'parts':'رديتر مياه، مراية'}],'payments':[]}))
    if '/rpc/my_inbox' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps([
          {'request_id':'r4','shop_id':SHOP2,'num':104,'part':'فانوس أمامي يمين','me_is_shop':False,'other_name':'محل في السبتية','last_body':'تمام، دي هي بالظبط ومعاها ضمان ٧ أيام','last_photo':False,'last_mine':False,'last_at':ago(4),'unread':2,'ordered':False},
          {'request_id':'r3','shop_id':SHOP2,'num':103,'part':'مراية جانبية شمال','me_is_shop':False,'other_name':'تشليح الأمانة','last_body':'أيوه هبعتهالك دلوقتي','last_photo':False,'last_mine':True,'last_at':ago(200),'unread':0,'ordered':True}]))
    if '/rpc/shop_pay_options' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps([{'shop_id':SHOP2,'instapay':True},{'shop_id':UID,'instapay':False}]))
    if '/rpc/accept_offers' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps(['o1']))
    if '/functions/v1/' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'configured':False}))
    if '/rpc/shop_profile' in url:
        return await route.fulfill(status=200,content_type='application/json',body=json.dumps({'shop':{'id':SHOP2,'area':'السبتية','governorate':'القاهرة','shop_type':'used','specialties':['صاج وبودي','فوانيس ومرايات'],'brands':['هيونداي','نيسان'],'offers_delivery':True,'since':ago(60*24*40)},'sales':37,'rating':4.8,'ratings':21,'reviews':[{'rating':5,'review':'القطعة أصلي والمحل محترم جداً','part':'مراية جانبية','at':ago(60*24*2),'first_name':'محمد'},{'rating':4,'review':'اتأخر شوية بس القطعة ممتازة','part':'فانوس أمامي','at':ago(60*24*9),'first_name':'سارة'}]}))
    m=re.search(r'/rest/v1/([a-z_]+)',url)
    if m:
        rows=filt(tables.get(m.group(1),[]),url)
        if 'vnd.pgrst.object' in (req.headers.get('accept') or ''):
            body=json.dumps(rows[0] if rows else None)
        else: body=json.dumps(rows)
        return await route.fulfill(status=200,content_type='application/json',body=body)
    return await route.fulfill(status=200,content_type='application/json',body='{}')

fut = lambda m: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + m * 60))
H = {'open': '09:00', 'close': '22:00', 'off': [5]}
near = [
 {'id': SHOP2, 'name': 'الأمانة لقطع الغيار', 'area': 'السبتية', 'governorate': 'القاهرة', 'address': 'شارع السبتية، عمارة 40، قصاد البنزينة، السبتية، القاهرة', 'phone': '01198765432', 'phone2': '01234567890',
  'lat': 30.0626, 'lng': 31.2394, 'km': 2.4, 'photo_path': None, 'photos': [], 'about': 'متخصصين في قطع نيسان وهيونداي من ٢٠ سنة، وعندنا ورشة تركيب جنب المحل.', 'hours': H, 'sells': True, 'installs': True,
  'offers_delivery': True, 'brands': ['نيسان', 'هيونداي'], 'specialties': ['صاج وبودي', 'فوانيس ومرايات'], 'shop_type': 'used', 'rating': 4.6, 'ratings': 21, 'sales': 37, 'featured': True, 'services': ['brake-pads', 'lights'], 'since': ago(60*24*90)},
 {'id': UID, 'name': 'النور لقطع الغيار', 'area': 'التوفيقية', 'governorate': 'القاهرة', 'address': 'شارع التوفيقية، عمارة 5، التوفيقية، القاهرة', 'phone': '01012345678', 'phone2': '',
  'lat': 30.0560, 'lng': 31.2410, 'km': 7.8, 'photo_path': None, 'photos': [], 'about': '', 'hours': {'open': '10:00', 'close': '20:00', 'off': []}, 'sells': True, 'installs': False,
  'offers_delivery': False, 'brands': ['هيونداي', 'كيا'], 'specialties': ['ميكانيكا'], 'shop_type': 'both', 'rating': None, 'ratings': 0, 'sales': 0, 'featured': False, 'services': [], 'since': ago(60*24*20)},
 {'id': 'shop3', 'name': 'مركز الفرامل', 'area': 'مدينة نصر', 'governorate': 'القاهرة', 'address': 'عباس العقاد، مدينة نصر', 'phone': '01055555555', 'phone2': '',
  'lat': None, 'lng': None, 'km': None, 'photo_path': None, 'photos': [], 'about': '', 'hours': None, 'sells': False, 'installs': True,
  'offers_delivery': False, 'brands': [], 'specialties': [], 'shop_type': 'used', 'rating': 4.9, 'ratings': 5, 'sales': 6, 'featured': False, 'services': [], 'since': ago(60*24*5)},
]
svcs = [{'id': a, 'name_ar': b, 'name_en': c, 'category': '', 'sort': i, 'active': True} for i, (a, b, c) in enumerate([('brake-pads','تركيب تيل فرامل','Brake pads'),('suspension','تركيب قطع عفشة','Suspension parts'),('battery','تركيب بطارية','Battery'),('lights','تركيب فوانيس ومرايات','Lights and mirrors'),('other','تركيب حاجة تانية','Something else')])]
tables['install_services'] = svcs
tables['shop_install_services'] = [{'shop_id': SHOP2, 'service_id': 'brake-pads', 'price_from': 150, 'price_to': 250, 'needs_inspection': False, 'minutes': 45, 'note': 'شامل تنظيف الديسك'}, {'shop_id': SHOP2, 'service_id': 'lights', 'price_from': None, 'price_to': None, 'needs_inspection': True, 'minutes': None, 'note': ''}]
ir = {'id': 'ir1', 'num': 3001, 'customer_id': UID, 'service_id': 'brake-pads', 'car_make': 'هيونداي', 'car_model': 'فيرنا', 'car_year': 2014, 'part_desc': 'طقم تيل فرامل أمامي جديد', 'photo_path': None, 'notes': '', 'governorate': 'القاهرة', 'area': 'مدينة نصر', 'target_shop': None, 'status': 'open', 'created_at': ago(30)}
tables['install_requests'] = [ir]
tables['install_quotes'] = [{'id': 'iq1', 'request_id': 'ir1', 'shop_id': SHOP2, 'price': 200, 'price_max': None, 'needs_inspection': False, 'note': 'التركيب بياخد ساعة', 'earliest': 'النهارده', 'created_at': ago(10)},
                            {'id': 'iq2', 'request_id': 'ir1', 'shop_id': 'shop3', 'price': None, 'price_max': None, 'needs_inspection': True, 'note': '', 'earliest': 'بكرة', 'created_at': ago(5)}]
bk = {'id': 'bk1', 'num': 7001, 'request_id': 'ir0', 'quote_id': None, 'order_id': None, 'shop_id': SHOP2, 'customer_id': UID, 'appointment_at': fut(60*26), 'price': 300, 'status': 'confirmed',
      'price_change': 380, 'price_change_note': 'محتاج جلبة زيادة', 'cancel_note': '', 'dispute_note': '', 'cancelled_by': '', 'rating': None, 'review': '', 'rated_at': None, 'done_at': None, 'created_at': ago(100)}
tables['bookings'] = [bk]
for s in tables['shops']: s.update({'sells': True, 'installs': True, 'hours': H, 'lat': 30.06, 'lng': 31.24})
for q in quotes:
    if q['id'] == 'qa': q.update({'install_available': True, 'install_fee': 250})
    if q['id'] == 'qb': q.update({'install_available': True, 'install_fee': None, 'install_needs_inspection': True})
for o in orders:
    if o['id'] == 'o1': o.update({'install_fee': 250, 'install_at': fut(60*30), 'install_status': 'confirmed'})
people = [{'shop_name': 'الأمانة لقطع الغيار', 'shop_phone': '01198765432', 'shop_address': 'شارع السبتية، عمارة 40، السبتية، القاهرة', 'shop_lat': 30.06, 'shop_lng': 31.24, 'customer_name': 'أحمد', 'customer_phone': '01012345678', 'service': 'تركيب قطع عفشة', 'car': 'هيونداي فيرنا 2014', 'part_desc': 'مساعدين أمامي', 'photo_path': None, 'notes': ''}]
reviews = [{'rating': 5, 'review': 'ركّبوا التيل بسرعة وبالسعر المتفق عليه', 'part': 'تركيب تيل فرامل', 'at': ago(60*24*3), 'first_name': 'محمد', 'kind': 'install'}, {'rating': 4, 'review': 'القطعة كويسة', 'part': 'مراية جانبية', 'at': ago(60*24*9), 'first_name': 'سارة', 'kind': 'part'}]
base_handle = handle
async def handle2(route):
    url = route.request.url
    J = lambda v: route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
    if '/rpc/shops_near' in url:
        body = route.request.post_data_json or {}
        sid = body.get('p_shop')
        return await J([s for s in near if not sid or s['id'] == sid])
    if '/rpc/shop_reviews' in url: return await J(reviews)
    if '/rpc/booking_people' in url: return await J(people)
    return await base_handle(route)
handle = handle2

_h2 = handle2
async def handle3(route):
    url = route.request.url
    J = lambda v: route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
    if '/rpc/my_shop' in url:
        me = next((s for s in tables['shops'] if s['id']==UID), None)
        if me: me = {**me, **next((n for n in near if n['id']==UID), {}), 'accepting': True, 'status': 'approved'}
        return await J(me)
    if '/rpc/shop_performance' in url:
        return await J({'reply_min': 34, 'answered_pct': 82, 'offers': 48, 'sold': 19, 'cancels': 1, 'refusal_pct': 6, 'rating': 4.6, 'ratings': 21})
    if '/rpc/shop_complaints' in url: return await J([])
    if '/rpc/my_deposit_share' in url: return await J({'owed': 0, 'paid': 0, 'rows': []})
    if '/rpc/s_balance' in url or '/rpc/shop_statements' in url: return await J({'statements': [], 'owed': 0, 'paid': 0})
    return await _h2(route)
handle = handle3

# car catalogue (same generator as the migration)
import os, sys as _sys, io as _io, contextlib as _ctx, importlib.util as _ilu
_spec=_ilu.spec_from_file_location('catalogue', os.path.join(os.path.dirname(__file__),'catalogue.py')); _g=_ilu.module_from_spec(_spec)
with _ctx.redirect_stdout(_io.StringIO()): _spec.loader.exec_module(_g)
tables['car_makes']=[{'id':a,'name_ar':b,'name_en':c,'country':d,'logo_url':'','home_rank':e or None,'powertrains':f,'active':'true'} for a,b,c,d,e,f in _g.makes]
tables['car_models']=[{'id':f'{mk}-{i}','make_id':mk,'name_ar':a,'name_en':b,'year_from':None,'year_to':None,'powertrains':p,'sort':i,'active':'true'} for mk,ms in _g.M.items() for i,(a,b,p) in enumerate(ms)]
profile['car_powertrain']='hev'
fut = lambda m: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + m * 60))
for q in quotes: q['expires_at'] = fut(48 * 60)
tables['customer_addresses'] = []

# ---- call recorder: wraps handle, records what each screen asks the backend ----
from urllib.parse import urlparse, parse_qs, unquote
CALLS = []
def _describe(req):
    u = urlparse(req.url); path = u.path
    m = re.search(r'/rest/v1/rpc/([a-z_]+)', path)
    if m: kind, name = 'rpc', m.group(1)
    else:
        m = re.search(r'/rest/v1/([a-z_]+)', path)
        if m: kind, name = 'table', m.group(1)
        elif '/functions/v1/' in path: kind, name = 'function', path.split('/functions/v1/')[1].split('/')[0]
        elif '/auth/v1/' in path: kind, name = 'auth', path.split('/auth/v1/')[1].split('/')[0]
        elif '/storage/v1/' in path: kind, name = 'storage', path.split('/storage/v1/')[1].split('/')[0]
        else: kind, name = 'other', path
    q = parse_qs(u.query)
    filters = sorted(k + ('=' + unquote(v[0]).split('.')[0] if k not in ('select','order','limit','offset') and v and '.' in v[0] else '') for k, v in q.items() if k != 'select')
    sel = unquote(q['select'][0]) if 'select' in q else ''
    body = req.post_data_json if req.method in ('POST','PATCH') else None
    bkeys = sorted(body.keys()) if isinstance(body, dict) else (['[rows]'] if isinstance(body, list) else [])
    return {'m': req.method, 'kind': kind, 'name': name, 'filters': filters, 'select': sel, 'body': bkeys}
_inner = handle
async def handle(route):
    try: CALLS.append(_describe(route.request))
    except Exception as e: CALLS.append({'err': str(e)})
    return await _inner(route)
