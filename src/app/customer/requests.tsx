import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomNav } from '@/components/AppHeader';
import { bucketOf, type Bucket } from '@/components/OrderRows';
import { Btn, Empty, Enter, Icon, Loading, Muted, Press, Row, Screen, Seg, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ORDER_LABEL, ar, elapsed, groupRequests, money, orderNo, partsLabel, reqNo, type Order, type Quote, type Request } from '@/lib/data';
import { must, useLive, useNow } from '@/lib/live';
import { needsPayment } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import { t } from '@/lib/i18n';
import fmt from '@/lib/fmt';
import { carLabel } from '@/lib/catalogue';
import { whenLabel } from '@/components/Appointment';
import { BOOKING_STATUS, type Booking } from '@/components/BookingView';
import type { InstallRequest } from '@/lib/install';
import { serviceName, useInstallServices } from '@/lib/shops';

type Tab = 'active' | 'done';

/** Everything the customer started, in two tabs: still going (requests and open orders, what needs you first) and finished. */
export default function MyRequests() {
  const { ready, session } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const uid = session?.user.id;
  // older links still say quotes / preparing / ready: they all open the «شغّالة» tab
  const [picked, setTab] = useState<Tab | null>(params.tab === 'done' ? 'done' : params.tab ? 'active' : null);
  const now = useNow(60000);
  const services = useInstallServices(true);
  const { data, loading } = useLive(async () => {
    if (!uid) return { reqs: [] as Request[], quotes: [] as Pick<Quote, 'id' | 'request_id'>[], orders: [] as Order[], ireqs: [] as InstallRequest[], iq: [] as { request_id: string }[], bookings: [] as Booking[] };
    const [reqs, orders, ir, bk] = await Promise.all([
      supabase.from('requests').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(200),
      supabase.from('orders').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(100),
      supabase.from('install_requests').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(50),
      supabase.from('bookings').select('*').eq('customer_id', uid).order('created_at', { ascending: false }).limit(50),
    ]);
    const ireqs = (ir.data ?? []) as InstallRequest[];
    const openIds = ireqs.filter((x) => x.status === 'open').map((x) => x.id);
    const iq = openIds.length ? ((await supabase.from('install_quotes').select('request_id').in('request_id', openIds)).data ?? []) as { request_id: string }[] : [];
    const rs = must(reqs) as Request[];
    const ids = rs.filter((r) => r.status === 'open').map((r) => r.id);
    const quotes = ids.length ? (must(await supabase.from('quotes').select('id, request_id').in('request_id', ids)) as Pick<Quote, 'id' | 'request_id'>[]) : [];
    return { reqs: rs, quotes, orders: must(orders) as Order[], ireqs, iq, bookings: (bk.data ?? []) as Booking[] };
  }, ['requests', 'quotes', 'orders', 'install_requests', 'install_quotes', 'bookings'], [uid]);

  if (ready && !session) return <Redirect href="/login" />;
  const reqs = data?.reqs ?? [];
  const orders = data?.orders ?? [];
  const openGroups = groupRequests(reqs).filter((g) => g.items.some((r) => r.status === 'open'));
  const offersOf = (g: (typeof openGroups)[number]) => data!.quotes.filter((q) => g.items.some((r) => r.id === q.request_id && r.status === 'open')).length;
  const inTab = (b: Bucket) => orders.filter((o) => bucketOf(o) === b);
  const live = [...inTab('ready'), ...inTab('preparing')];
  const tab: Tab = picked ?? (openGroups.length || live.length || (data?.ireqs ?? []).some((x) => x.status === 'open') || (data?.bookings ?? []).some((b) => !['done', 'cancelled'].includes(b.status)) ? 'active' : 'done');
  const partsOf = (o: Order) => reqs.filter((r) => r.order_id === o.id);
  // requests that closed after 7 days with no order (A16)
  const expired = groupRequests(reqs).filter((g) => g.items.some((r) => r.status === 'expired') && g.items.every((r) => r.status === 'expired' || r.status === 'cancelled'));
  const finished = inTab('done');
  const openInstalls = (data?.ireqs ?? []).filter((x) => x.status === 'open');
  const liveBookings = (data?.bookings ?? []).filter((b) => !['done', 'cancelled'].includes(b.status) || (b.status === 'done' && !b.rated_at));
  const pastBookings = (data?.bookings ?? []).filter((b) => (b.status === 'done' && b.rated_at) || b.status === 'cancelled');
  const activeCount = openGroups.length + live.length + openInstalls.length + liveBookings.length;
  const svcName = (id: string) => serviceName(services.find((x) => x.id === id)) || t('تركيب');

  /** One row: what it is, its status, and the next step; rows with a next step are "needs you" and come first. */
  type Item = { key: string; needs: boolean; el: React.ReactElement };
  const card = (key: string, title: string, sub: string, status: string, tone: [string, string], when: string, next: string, go: () => void): Item => ({
    key, needs: !!next,
    el: (
      <Press key={key} onPress={go} label={title}
        style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: next ? colors.primary : colors.line, padding: 16, gap: 10 }}>
        <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w="semibold" size={16} numberOfLines={1}>{title}</T>
            <Muted size={13} numberOfLines={1}>{sub}</Muted>
          </View>
          <View style={{ backgroundColor: tone[0], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone[1] }} />
            <T size={12.5} w="semibold" color={tone[1]} style={{ lineHeight: 18 }}>{status}</T>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>
          <Muted size={13}>{when}</Muted>
          {next ? <Row gap={4}><T size={14} w="display" color={colors.primaryText}>{next}</T><Icon name="chevron-back" size={14} color={colors.primaryText} /></Row> : null}
        </Row>
      </Press>
    ),
  });
  /** Two groups: what needs the customer now, then what is moving on its own. */
  const grouped = (items: Item[]) => {
    const needs = items.filter((x) => x.needs), rest = items.filter((x) => !x.needs);
    return (
      <View style={{ gap: 18 }}>
        {needs.length ? <View style={{ gap: 10 }}><Row gap={8}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime }} /><T w="displayBold" size={15}>{t('محتاج منك')}</T></Row>{needs.map((x, i) => <Enter key={x.key} i={i}>{x.el}</Enter>)}</View> : null}
        {rest.length ? <View style={{ gap: 10 }}><Row gap={8}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber }} /><T w="displayBold" size={15}>{t('شغّال')}</T></Row>{rest.map((x, i) => <Enter key={x.key} i={needs.length + i}>{x.el}</Enter>)}</View> : null}
      </View>
    );
  };
  const blue: [string, string] = [colors.primarySoft, colors.primaryText], grey: [string, string] = [colors.soft, colors.muted];
  const green: [string, string] = [colors.goodSoft, colors.good], orange: [string, string] = [colors.warnSoft, colors.warn], red: [string, string] = [colors.badSoft, colors.bad];
  const groupsSorted = [...openGroups].sort((a, b) => offersOf(b) - offersOf(a));

  return (
    <Screen nav={<BottomNav role="customer" />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T w="display" size={26} style={{ lineHeight: 36 }}>{t('طلباتي')}</T>
        <Row gap={8}>
          <Btn kind="small" icon="construct-outline" title={t('تركيب')} onPress={() => router.push('/install/new')} />
          <Btn kind="small" icon="add" title={t('طلب جديد')} onPress={() => router.push('/customer/new')} />
        </Row>
      </Row>
      <Seg options={[{ v: 'active', label: activeCount ? t('شغّالة ({0})', ar(activeCount)) : t('شغّالة') }, { v: 'done', label: t('خلصت') }]} value={tab} onPick={(v) => setTab(v as Tab)} />

      {loading && !data ? <Loading /> : tab === 'active' ? (
        activeCount ? (
          grouped([
            ...liveBookings.map((b) => card(b.id, t('حجز تركيب #{0}', ar(b.num)), whenLabel(b.appointment_at), BOOKING_STATUS[b.status].label,
              b.status === 'ready' || (b.status === 'done' && !b.rated_at) ? green : b.status === 'disputed' ? red : b.price_change != null ? orange : blue,
              b.price != null ? t('{0} ج.م', money(Number(b.price))) : t('السعر بعد المعاينة'),
              b.price_change != null ? t('ردّ على السعر') : b.status === 'ready' ? t('أكّد إنه تمام') : b.status === 'done' ? t('قيّم المحل') : t('تابع الحجز'),
              () => router.push({ pathname: '/booking/[id]', params: { id: b.id } }))),
            ...openInstalls.map((r) => {
              const n = (data?.iq ?? []).filter((q) => q.request_id === r.id).length;
              return card(r.id, svcName(r.service_id), t('طلب تركيب #{0} · {1}', ar(r.num), carLabel(r.car_make, r.car_model)), n ? (n > 1 ? t('{0} عروض', ar(n)) : t('عرض')) : t('بندوّر'),
                n ? blue : grey, t('من {0}', elapsed(r.created_at, now)), n ? t('قارن واحجز') : '', () => router.push({ pathname: '/install/[id]', params: { id: r.id } }));
            }),
            ...groupsSorted.filter((g) => offersOf(g) > 0).map((g) => {
              const open = g.items.filter((r) => r.status === 'open'); const n = offersOf(g);
              return card(g.key, partsLabel(open), t('طلب {0} · {1}', reqNo(g.first.num), carLabel(g.first.car_make, g.first.car_model)), n > 1 ? t('{0} عروض', ar(n)) : t('عرض'), blue, t('من {0}', elapsed(g.first.created_at, now)), t('قارن العروض'), () => router.push(`/customer/${g.first.id}`));
            }),
            ...live.map((o) => {
              const ps = partsOf(o); const pay = needsPayment(o); const ready = bucketOf(o) === 'ready';
              return card(o.id, ps.length ? partsLabel(ps) : t('أوردر'), t('أوردر {0} · {1} ج.م', orderNo(o.order_no), money(Number(o.items_total) + Number(o.delivery_fee))),
                pay ? t('ادفع') : ORDER_LABEL[o.status].short, pay ? orange : ready ? green : orange, t('من {0}', elapsed(o.created_at, now)), pay ? t('ادفع دلوقتي') : ready ? t('استلم') : '',
                () => router.push({ pathname: '/order/[id]', params: { id: o.id } }));
            }),
            ...groupsSorted.filter((g) => !offersOf(g)).map((g) => {
              const open = g.items.filter((r) => r.status === 'open');
              return card(g.key, partsLabel(open), t('طلب {0} · {1}', reqNo(g.first.num), carLabel(g.first.car_make, g.first.car_model)), t('بندوّر'), grey, t('من {0}', elapsed(g.first.created_at, now)), '', () => router.push(`/customer/${g.first.id}`));
            }),
          ])
        ) : <Empty icon="pricetags-outline" text={t('مفيش طلبات شغّالة دلوقتي.')} action={{ label: t('اطلب قطعة'), onPress: () => router.push('/customer/new') }} />
      ) : finished.length || expired.length || pastBookings.length ? (
        <View style={{ gap: 10 }}>
          {[...pastBookings.map((b) => card(b.id, t('حجز تركيب #{0}', ar(b.num)), whenLabel(b.appointment_at), BOOKING_STATUS[b.status].label, b.status === 'cancelled' ? red : grey,
            b.rating ? t('قيّمت {0} ★', ar(b.rating)) : '', '', () => router.push({ pathname: '/booking/[id]', params: { id: b.id } }))),
          ...finished.map((o) => {
            const ps = partsOf(o);
            return card(o.id, ps.length ? partsLabel(ps) : t('أوردر'), t('أوردر {0} · {1} ج.م', orderNo(o.order_no), money(Number(o.items_total) + Number(o.delivery_fee))),
              ORDER_LABEL[o.status].short, o.status === 'cancelled' ? red : grey,
              fmt.date(o.created_at, false), o.status === 'received' && !o.rating ? t('قيّم المحل') : '',
              () => router.push({ pathname: '/order/[id]', params: { id: o.id } }));
          }),
          ...expired.map((g) => card(g.key, partsLabel(g.items), t('طلب {0}', reqNo(g.first.num)), t('انتهى'), grey, t('من غير أوردر'), t('اطلب تاني'),
            () => router.push({ pathname: '/customer/new', params: { part: g.first.part, cond: g.first.wanted_condition } })))].map((x, i) => <Enter key={x.key} i={i}>{x.el}</Enter>)}
        </View>
      ) : <Empty icon="time-outline" text={t('لسه مفيش أوردرات خلصت.')} />}
    </Screen>
  );
}
