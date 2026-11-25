import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomNav, rememberRole, InboxButton } from '@/components/AppHeader';
import { Bell } from '@/components/Bell';
import { Logo } from '@/components/Brand';
import { MakeLogo } from '@/components/MakeLogo';
import { carLabel, usePreloadModels, isElectrified, makeByName, ptShort, useMakes } from '@/lib/catalogue';
import { Enter, Icon, Loading, Muted, Pill, Press, Row, Screen, Section, T } from '@/components/ui';
import { AdBanner } from '@/components/AdBanner';
import { useAuth } from '@/lib/auth';
import { ORDER_LABEL, ar, groupRequests, orderNo, partsLabel, reqNo, type Order, type Quote, type Request } from '@/lib/data';
import { must, useLive } from '@/lib/live';
import { needsPayment } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { colors, liftStrong } from '@/lib/theme';
import { t } from '@/lib/i18n';

const CATEGORIES: { key: string; label: string; part: string; icon: string }[] = [
  { key: 'فوانيس', label: t('فوانيس'), part: 'فانوس أمامي', icon: 'car-light-high' },
  { key: 'مرايات', label: t('مرايات'), part: 'مراية جانبية', icon: 'mirror' },
  { key: 'رديتر', label: t('رديتر'), part: 'رديتر مياه', icon: 'radiator' },
  { key: 'تكييف', label: t('تكييف'), part: 'كمبروسر تكييف', icon: 'air-conditioner' },
  { key: 'فرامل', label: t('فرامل'), part: 'تيل فرامل', icon: 'car-brake-alert' },
  { key: 'دبرياج', label: t('دبرياج'), part: 'طقم دبرياج', icon: 'car-clutch' },
  { key: 'كهرباء', label: t('كهرباء'), part: 'دينامو', icon: 'car-battery' },
  { key: 'صاج', label: t('صاج'), part: 'رفرف', icon: 'car-door' },
];

/** The four main services on the home screen. */
const SERVICES = [
  { href: '/customer/new', title: t('قطع غيار'), sub: t('اطلب قطعة وقارن عروض المحلات'), icon: 'car-cog' },
  { href: '/install/new', title: t('تركيب قطع الغيار'), sub: t('معاك القطعة؟ محل قريب يركّبها'), icon: 'wrench' },
  { href: '/shops', title: t('محلات قريبة منك'), sub: t('شوف المحلات على الخريطة'), icon: 'map-marker-radius' },
  { href: '/cars', title: t('عربيتك'), sub: t('عربياتك وبياناتها'), icon: 'car-side' },
];

const EV_CATEGORY = { key: 'كهربا وهايبرد', label: t('كهربا وهايبرد'), part: 'بطارية الجهد العالي', icon: 'car-electric' };

export default function CustomerHome() {
  const { ready, session, profile } = useAuth();
  const uid = session?.user.id;
  const { makes } = useMakes();
  usePreloadModels([profile?.car_make]);
  useEffect(() => { rememberRole('customer'); }, []);
  const { data } = useLive(async () => {
    if (!uid) return { reqs: [] as Request[], quotes: [] as Pick<Quote, 'id' | 'request_id'>[], orders: [] as Order[] };
    const reqs = must(await supabase.from('requests').select('*').eq('customer_id', uid).in('status', ['open', 'chosen']).order('created_at', { ascending: false }).limit(30)) as Request[];
    const ids = reqs.filter((r) => r.status === 'open').map((r) => r.id);
    const quotes = ids.length ? (must(await supabase.from('quotes').select('id, request_id').in('request_id', ids)) as Pick<Quote, 'id' | 'request_id'>[]) : [];
    const orders = must(await supabase.from('orders').select('*').eq('customer_id', uid).in('status', ['preparing', 'ready', 'out_for_delivery', 'delivered']).order('created_at', { ascending: false }).limit(10)) as Order[];
    return { reqs, quotes, orders };
  }, ['requests', 'quotes', 'orders'], [uid], { pollMs: 20000 });

  if (ready && !session) return <Redirect href="/login" />;
  if (profile && (!profile.is_customer || !profile.street)) return <Redirect href="/profile" />;
  if (!profile) return <Screen><Loading /></Screen>;
  const first = (profile.full_name || '').split(' ')[0];
  const newReq = (part?: string) => router.push(part ? { pathname: '/customer/new', params: { part } } : '/customer/new');
  const groups = groupRequests((data?.reqs ?? []).filter((r) => r.status === 'open')).slice(0, 6);
  const orders = data?.orders ?? [];
  const offersIn = (g: (typeof groups)[number]) => (data?.quotes ?? []).filter((q) => g.items.some((r) => r.id === q.request_id && r.status === 'open')).length;
  const hot = groups.map((g) => ({ g, n: offersIn(g) })).filter((x) => x.n > 0);
  const waiting = groups.filter((g) => !offersIn(g));

  // the top band, in the brand navy with a curved bottom: greeting, the car, and the one big control: search
  const hero = (
    <View style={{ backgroundColor: colors.brand, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Logo size={22} on="dark" intro />
          <Row gap={8}><InboxButton light /><Bell light /></Row>
        </Row>
        <View>
          <T size={14} color="rgba(255,255,255,.72)">{t('أهلاً يا')}{' '}{first}</T>
          <T w="display" size={26} color="#fff" style={{ lineHeight: 36 }}>{t('محتاج قطعة إيه؟')}</T>
        </View>
        <Press onPress={() => router.push('/cars')} label={t('عربيتي')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingStart: 6, paddingEnd: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.1)', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <MakeLogo make={makeByName(makes, profile.car_make) ?? (profile.car_make ? { name_ar: profile.car_make, name_en: profile.car_make, logo_url: '' } : null)} size={34} />
          {profile.car_make ? <T w="semibold" size={14} color="#fff" numberOfLines={1} style={{ flexShrink: 1 }}>{carLabel(profile.car_make, profile.car_model, profile.car_year)}</T>
            : <T w="semibold" size={14} color="#fff" numberOfLines={1} style={{ flexShrink: 1 }}>{t('ضيف عربيتك عشان العروض تبقى مظبوطة')}</T>}
          {profile.car_powertrain && profile.car_powertrain !== 'petrol' ? <Pill label={ptShort(profile.car_powertrain)} tone={isElectrified(profile.car_powertrain) ? 'good' : 'plain'} /> : null}
          <Icon name="chevron-down" size={16} color={colors.sky} />
        </Press>
        <Press onPress={() => newReq()} label={t('اكتب اسم القطعة')}
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, paddingStart: 16, paddingEnd: 8, height: 60 }, liftStrong]}>
          <Icon name="search" size={22} color={colors.brand} stroke={2.2} />
          <T size={16} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>{t('اكتب اسم القطعة، مثلاً فانوس أمامي')}</T>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={21} color={colors.primaryText} />
          </View>
        </Press>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={13} color="rgba(255,255,255,.65)">{t('ابعت طلبك وقارن عروض أكتر من محل')}</T>
          <Press onPress={() => router.push('/assistant')} label={t('اوصف القطعة للمساعد')} role="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="sparkles" size={15} color={colors.sky} />
            <T size={13} w="semibold" color={colors.sky}>{t('مش عارف اسمها؟')}</T>
          </Press>
        </Row>
      </View>
    </View>
  );

  const nothingYet = !groups.length && !orders.length;
  const shortcuts = [
    { href: '/install/new', title: t('اطلب تركيب'), icon: 'wrench' },
    { href: '/shops', title: t('محلات حواليك'), icon: 'map-marker-radius' },
    { href: '/customer/requests', title: t('طلباتي السابقة'), icon: 'history' },
    { href: '/cars', title: t('عربياتي'), icon: 'car-side' },
  ];
  const cats = isElectrified(profile.car_powertrain) ? [EV_CATEGORY, ...CATEGORIES.slice(0, 7)] : CATEGORIES;

  return (
    <Screen top={hero} topColor={colors.brand} nav={<BottomNav role="customer" />}>
      {/* the live strip: what the customer is waiting on, newest first; new users see how it works instead */}
      {!nothingYet ? (
        <View style={{ gap: 10 }}>
          <Section title={t('طلباتك الحالية')} action={{ label: t('الكل'), onPress: () => router.push('/customer/requests') }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {hot.map(({ g, n }, i) => (
              <Enter key={g.key} i={i}>
                <Press onPress={() => router.push(`/customer/${g.first.id}`)} label={t('قارن العروض')}
                  style={[s.live, { backgroundColor: colors.brand }]}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Pill label={n > 1 ? t('{0} عروض', ar(n)) : t('عرض واحد')} tone="good" icon="pricetags" />
                    <T size={12} color="rgba(255,255,255,.6)">{reqNo(g.first.num)}</T>
                  </Row>
                  <T w="semibold" size={15} color="#fff" numberOfLines={2} style={{ flex: 1 }}>{partsLabel(g.items.filter((r) => r.status === 'open'))}</T>
                  <Row gap={6}><T w="display" size={14} color={colors.sky}>{t('قارن')}</T><Icon name="chevron-back" size={14} color={colors.sky} /></Row>
                </Press>
              </Enter>
            ))}
            {orders.slice(0, 4).map((o, i) => {
              const ps = (data?.reqs ?? []).filter((r) => r.order_id === o.id);
              const pay = needsPayment(o);
              return (
                <Enter key={o.id} i={hot.length + i}>
                  <Press onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} label={t('تابع الأوردر')} style={s.live}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Pill label={pay ? t('ادفع') : ORDER_LABEL[o.status].short} tone={pay ? 'wait' : o.status === 'preparing' ? 'wait' : 'good'} icon={ORDER_LABEL[o.status].icon} />
                      <T size={12} color={colors.faint}>{orderNo(o.order_no)}</T>
                    </Row>
                    <T w="semibold" size={15} numberOfLines={2} style={{ flex: 1 }}>{ps.length ? partsLabel(ps) : t('أوردر')}</T>
                    <Row gap={6}><T w="display" size={14} color={colors.primaryText}>{t('تابع')}</T><Icon name="chevron-back" size={14} color={colors.primaryText} /></Row>
                  </Press>
                </Enter>
              );
            })}
            {waiting.slice(0, 3).map((g, i) => (
              <Enter key={g.key} i={hot.length + orders.length + i}>
                <Press onPress={() => router.push(`/customer/${g.first.id}`)} label={partsLabel(g.items)} style={s.live}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Pill label={t('مستني عروض')} tone="wait" icon="hourglass" />
                    <T size={12} color={colors.faint}>{reqNo(g.first.num)}</T>
                  </Row>
                  <T w="semibold" size={15} numberOfLines={2} style={{ flex: 1 }}>{partsLabel(g.items)}</T>
                  <Muted size={12.5}>{t('المحلات بتشوف طلبك دلوقتي')}</Muted>
                </Press>
              </Enter>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Section title={t('إزاي بيشتغل')} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[[t('اكتب اسم القطعة أو صوّرها'), 'camera-outline'], [t('قارن عروض المحلات'), 'pricetags-outline'], [t('أكّد الأوردر من التطبيق'), 'checkmark-circle-outline']].map(([text, icon], i) => (
              <View key={text} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 }}>
                <Row gap={8}><View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' }}><T w="display" size={12} color={colors.brand}>{ar(i + 1)}</T></View><Icon name={icon} size={18} color={colors.brand} /></Row>
                <T size={13} w="medium">{text}</T>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* shortcuts */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {shortcuts.map((x) => (
          <Press key={x.href} onPress={() => router.push(x.href as any)} label={x.title}
            style={{ flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon set="mci" name={x.icon} size={23} color={colors.brand} />
            </View>
            <T size={12} w="semibold" center numberOfLines={2} style={{ lineHeight: 16 }}>{x.title}</T>
          </Press>
        ))}
      </View>

      <AdBanner />

      {/* popular parts for this car, as chips rather than a grid of tiles */}
      <Section title={profile.car_make ? t('قطع بتتطلب كتير لـ{0}', profile.car_make) : t('قطع بتتطلب كتير')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cats.map((c) => (
            <Press key={c.label} onPress={() => router.push({ pathname: '/customer/new', params: { cat: c.key } })} label={c.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 8, paddingEnd: 14, height: 44, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Icon set="mci" name={c.icon} size={17} color={colors.brand} /></View>
              <T size={14} w="medium">{c.label}</T>
            </Press>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  live: { width: 230, minHeight: 128, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8 },
});
