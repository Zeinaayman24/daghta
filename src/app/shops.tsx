import * as Location from 'expo-location';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/AppHeader';
import { MAP_AVAILABLE, ShopMap } from '@/components/ShopMap';
import { ShopCard } from '@/components/ShopCard';
import { BackBar, Btn, Empty, Enter, Field, Icon, IconButton, Loading, Muted, Press, Row, Screen, Sheet, T, toast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ar } from '@/lib/data';
import { t } from '@/lib/i18n';
import { must, useLive } from '@/lib/live';
import {
  CAIRO, directionsUrl, inEgypt, kmLabel, openNow, searchPlace, serviceKind, serviceName, useInstallServices,
  type LatLng, type NearShop,
} from '@/lib/shops';
import { photoUrl, supabase } from '@/lib/supabase';
import { bp, colors, liftHover, liftStrong } from '@/lib/theme';
import { springTo } from '@/lib/motion';

const LOC_KEY = 'daghta-near-loc';
const DISTANCES: { v: number; label: string }[] = [
  { v: 5, label: t('٥ كم') }, { v: 10, label: t('١٠ كم') }, { v: 20, label: t('٢٠ كم') }, { v: 50, label: t('٥٠ كم') }, { v: 0, label: t('الكل') },
];
type Kind = 'all' | 'sell' | 'both' | 'install';
type Sort = 'near' | 'rating';

/** Remembered "my location" (web only), so coming back to the directory doesn't ask again. */
function savedLoc(): (LatLng & { label: string }) | null {
  try {
    if (Platform.OS !== 'web') return null;
    const v = JSON.parse(localStorage.getItem(LOC_KEY) || 'null');
    return v && typeof v.lat === 'number' && typeof v.lng === 'number' ? v : null;
  } catch { return null; }
}
function saveLoc(v: LatLng & { label: string }) {
  try { if (Platform.OS === 'web') localStorage.setItem(LOC_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
}

/** «محلات قريبة منك»: every approved shop on a map and in a list, nearest first, with filters. */
export default function ShopsNear() {
  const { ready, session } = useAuth();
  const params = useLocalSearchParams<{ install?: string; service?: string }>();
  const services = useInstallServices();
  const [loc, setLoc] = useState<(LatLng & { label: string }) | null>(savedLoc);
  const [km, setKm] = useState(loc ? 20 : 0);
  const [kind, setKind] = useState<Kind>(params.install ? 'install' : 'all');
  const [sort, setSort] = useState<Sort>('near');
  const [openOnly, setOpenOnly] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [brand, setBrand] = useState('');
  const [service, setService] = useState(params.service ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const [locSheet, setLocSheet] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<'brand' | 'service' | null>(null);
  const [detent, setDetent] = useState(0); // the sheet's resting height: 0 low, 1 half, 2 full list
  const [mapH, setMapH] = useState(0);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= bp.desktop;

  const { data, loading } = useLive(async () =>
    must(await supabase.rpc('shops_near', { p_lat: loc?.lat ?? null, p_lng: loc?.lng ?? null })) as NearShop[],
  ['shops'], [loc?.lat, loc?.lng]);

  const all = data ?? [];
  const brands = useMemo(() => [...new Set(all.flatMap((s) => s.brands))].sort((a, b) => a.localeCompare(b, 'ar')), [all]);
  const list = useMemo(() => {
    const now = new Date();
    const out = all.filter((s) => {
      if (loc && km && (s.km == null || s.km > km)) return false;
      if (kind === 'sell' && !(s.sells && !s.installs)) return false;
      if (kind === 'both' && !(s.sells && s.installs)) return false;
      if (kind === 'install' && !s.installs) return false;
      if (openOnly && openNow(s.hours, now) !== true) return false;
      if (delivery && !s.offers_delivery) return false;
      if (brand && !s.brands.includes(brand)) return false;
      if (service && !(s.installs && (s.services.length === 0 || s.services.includes(service) || s.services.includes('other')))) return false;
      return true;
    });
    if (sort === 'rating') out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratings - a.ratings);
    return out;
  }, [all, loc, km, kind, openOnly, delivery, brand, service, sort]);

  if (ready && !session) return <Redirect href="/login" />;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/customer'));

  function use(p: LatLng, label: string) {
    if (!inEgypt(p)) { toast(t('المكان ده بره مصر.')); return; }
    const v = { ...p, label };
    setLoc(v); saveLoc(v); setLocSheet(false); setPicking(false); setHits(null); setQ('');
    if (!km) setKm(20);
  }

  async function here() {
    setBusy('here');
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== 'granted') { toast(t('اسمح للتطبيق يعرف مكانك، أو اكتب منطقتك.')); setBusy(null); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      use({ lat: pos.coords.latitude, lng: pos.coords.longitude }, t('مكاني الحالي'));
    } catch { toast(t('ماقدرناش نعرف مكانك. اكتب منطقتك بدل كده.')); }
    setBusy(null);
  }

  async function find() {
    if (q.trim().length < 2) return;
    setBusy('find');
    try {
      const r = await searchPlace(q);
      setHits(r);
    } catch { toast(t('البحث مش شغال دلوقتي. جرّب تاني بعد شوية.')); }
    setBusy(null);
  }

  const pins = list.filter((s) => s.lat != null && s.lng != null).map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, title: s.name }));
  const noPin = list.length - pins.length;
  const sel = list.find((s) => s.id === selected) ?? null;

  const kinds: { v: Kind; label: string }[] = [{ v: 'all', label: t('الكل') }, { v: 'sell', label: t('بيع بس') }, { v: 'both', label: t('بيع وتركيب') }, { v: 'install', label: t('تركيب') }];
  const nextKm = () => { const i = DISTANCES.findIndex((d) => d.v === km); setKm(DISTANCES[(i + 1) % DISTANCES.length].v); };
  const chip = (on: boolean, label: string, onPress: () => void, icon?: string) => (
    <Press key={label} onPress={onPress} selected={on} label={label}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? colors.brand : colors.surface, borderWidth: 1, borderColor: on ? colors.brand : colors.line }, liftHover]}>
      {icon ? <Icon name={icon} size={14} color={on ? '#fff' : colors.muted} /> : null}
      <T size={13} w={on ? 'semibold' : 'medium'} color={on ? '#fff' : colors.ink}>{label}</T>
    </Press>
  );
  const filters = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
      {chip(!!loc, loc?.label || (loc ? t('مكاني') : t('حدّد مكانك')), () => setLocSheet(true), 'location')}
      {loc ? chip(!!km, km ? DISTANCES.find((d) => d.v === km)?.label ?? '' : t('أي مسافة'), nextKm) : null}
      {kinds.map((k) => (k.v === 'all' ? null : chip(kind === k.v, k.label, () => setKind(kind === k.v ? 'all' : k.v))))}
      {chip(openOnly, t('مفتوح دلوقتي'), () => setOpenOnly(!openOnly), 'time-outline')}
      {chip(delivery, t('بيوصّل'), () => setDelivery(!delivery), 'bicycle-outline')}
      {chip(sort === 'rating', t('الأعلى تقييم'), () => setSort(sort === 'rating' ? 'near' : 'rating'), 'star-outline')}
      {chip(!!brand, brand || t('الماركة'), () => setPick('brand'), 'car')}
      {kind === 'install' || kind === 'both' || service ? chip(!!service, service ? serviceName(services.find((x) => x.id === service)) : t('خدمة التركيب'), () => setPick('service'), 'construct-outline') : null}
    </ScrollView>
  );
  const listEl = list.length
    ? <View style={{ gap: 12 }}>{(sel ? [sel, ...list.filter((x) => x.id !== sel.id)] : list).map((s, i) => <Enter key={s.id} i={i}><ShopCard s={s} services={services} /></Enter>)}</View>
    : <Empty icon="storefront-outline" text={loc && km ? t('مفيش محلات في المسافة دي. جرّب مسافة أكبر أو شيل فلتر.') : t('مفيش محلات بالفلاتر دي.')}
        action={loc && km && km < 50 ? { label: t('وسّع المسافة'), onPress: () => setKm(km < 10 ? 10 : km < 20 ? 20 : 50) } : undefined} />;
  const countLine = loading && !data ? t('بندوّر…') : list.length ? t('{0} محل', ar(list.length)) : t('مفيش محلات');
  const sheets = (
    <>
      <Sheet open={locSheet} onClose={() => { setLocSheet(false); setPicking(false); }} title={t('مكانك فين؟')}>
        <View style={{ gap: 12 }}>
          <Btn icon="locate" title={t('استخدم مكاني الحالي')} loading={busy === 'here'} onPress={here} />
          <Row gap={8} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Field value={q} onChangeText={setQ} placeholder={t('اكتب المنطقة، مثلاً مدينة نصر')} icon="search" /></View>
            <Btn kind="secondary" title={t('دوّر')} loading={busy === 'find'} disabled={q.trim().length < 2} onPress={find} style={{ minWidth: 80 }} />
          </Row>
          {hits ? (hits.length ? hits.map((h, i) => (
            <Press key={i} onPress={() => use(h, h.label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line }}>
              <Icon name="location-outline" size={18} color={colors.muted} /><T size={14} style={{ flex: 1 }} numberOfLines={2}>{h.label}</T>
            </Press>
          )) : <Muted>{t('مالقيناش المكان ده. جرّب اسم منطقة أو شارع مشهور.')}</Muted>) : null}
          {MAP_AVAILABLE ? (picking ? (
            <View style={{ gap: 6 }}>
              <Muted size={13}>{t('دوس على مكانك على الخريطة.')}</Muted>
              <ShopMap center={loc ?? CAIRO} zoom={loc ? 14 : 11} me={loc} height={280} onTap={(p) => use(p, t('مكان على الخريطة'))} />
            </View>
          ) : <Btn kind="link" title={t('حدّد على الخريطة')} onPress={() => setPicking(true)} />) : null}
          <Muted size={12}>{t('بحث الأماكن والخرايط من OpenStreetMap.')}</Muted>
        </View>
      </Sheet>
      <Sheet open={pick === 'brand'} onClose={() => setPick(null)} title={t('الماركة')}>
        <ScrollView style={{ maxHeight: 420 }}>
          {[{ v: '', label: t('كل الماركات') }, ...brands.map((b) => ({ v: b, label: b }))].map((o) => (
            <Press key={o.v} onPress={() => { setBrand(o.v); setPick(null); }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 10, backgroundColor: o.v === brand ? colors.soft : 'transparent' }}>
              <T w={o.v === brand ? 'semibold' : 'regular'}>{o.label}</T>{o.v === brand ? <Icon name="checkmark" size={18} /> : null}
            </Press>
          ))}
        </ScrollView>
      </Sheet>
      <Sheet open={pick === 'service'} onClose={() => setPick(null)} title={t('خدمة التركيب')}>
        <ScrollView style={{ maxHeight: 420 }}>
          {[{ v: '', label: t('أي خدمة') }, ...services.map((x) => ({ v: x.id, label: serviceName(x) }))].map((o) => (
            <Press key={o.v} onPress={() => { setService(o.v); setPick(null); }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 10, backgroundColor: o.v === service ? colors.soft : 'transparent' }}>
              <T w={o.v === service ? 'semibold' : 'regular'}>{o.label}</T>{o.v === service ? <Icon name="checkmark" size={18} /> : null}
            </Press>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
  const header = (
    <View style={{ paddingTop: insets.top + 6, backgroundColor: colors.brand, paddingBottom: 12, zIndex: 3 }}>
      <View style={{ width: '100%', maxWidth: wide ? 1100 : 560, alignSelf: 'center', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconButton name="chevron-forward" onPress={back} label={t('رجوع')} size={40} tone="clear" />
        <View style={{ flex: 1 }}><T w="displayBold" size={19} color="#fff" numberOfLines={1}>{t('محلات قريبة منك')}</T><T size={12.5} color="rgba(255,255,255,.7)">{countLine}{loc?.label ? ` · ${t('حوالين')} ${loc.label}` : ''}</T></View>
      </View>
    </View>
  );

  // no map on this platform, or a list-only request: the plain list
  if (!MAP_AVAILABLE) {
    return (
      <Screen header={<BackBar title={t('محلات قريبة منك')} onBack={back} />} nav={<BottomNav role="customer" />}>
        <View style={{ marginHorizontal: -20 }}>{filters}</View>
        {loading && !data ? <Loading /> : listEl}
        {sheets}
      </Screen>
    );
  }
  // desktop and tablet: the list beside the map, no sheet
  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.ground }}>
        <View style={{ width: 92, backgroundColor: colors.brand, paddingTop: insets.top + 16 }}><BottomNav role="customer" /></View>
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.line }}>{filters}</View>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <ScrollView style={{ width: 420, borderEndWidth: 1, borderColor: colors.line }} contentContainerStyle={{ padding: 20 }}>{loading && !data ? <Loading /> : listEl}</ScrollView>
            <View style={{ flex: 1 }}><ShopMap center={loc ?? CAIRO} zoom={loc ? 13 : 11} me={loc} pins={pins} selected={selected} onPin={setSelected} fit={!selected} height={Math.max(300, height - 200)} /></View>
          </View>
        </View>
        {sheets}
      </View>
    );
  }
  // phone: the map fills the screen; the shops live in a sheet with three resting heights
  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      {header}
      <View style={{ flex: 1 }} onLayout={(e) => setMapH(e.nativeEvent.layout.height)}>
        {mapH ? <ShopMap center={loc ?? CAIRO} zoom={loc ? 13 : 11} me={loc} pins={pins} selected={selected} onPin={(id) => { setSelected(id); setDetent(1); }} fit={!selected} height={mapH} /> : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>{filters}</View>
        <DragSheet detent={detent} onDetent={setDetent} height={mapH} tabBar={84 + Math.max(insets.bottom, 6)}>
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 }}>
            <T w="displayBold" size={16}>{countLine}</T>
            {noPin > 0 ? <Muted size={12}>{t('{0} من غير مكان على الخريطة', ar(noPin))}</Muted> : null}
          </Row>
          <ScrollView scrollEnabled={detent === 2} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
            {loading && !data ? <Loading /> : listEl}
          </ScrollView>
        </DragSheet>
      </View>
      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line, paddingBottom: Math.max(insets.bottom, 6) }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 8 }}><BottomNav role="customer" /></View>
      </View>
      {sheets}
    </View>
  );
}

/** The shops sheet: three resting heights (30%, 60%, 92% of the map area). Drag the handle; release springs to the nearest. */
function DragSheet({ detent, onDetent, height, tabBar, children }: { detent: number; onDetent: (d: number) => void; height: number; tabBar: number; children: React.ReactNode }) {
  const hs = [0.3, 0.6, 0.92].map((f) => Math.round(height * f));
  const y = useRef(new Animated.Value(height - hs[0])).current;
  const cur = useRef(height - hs[0]);
  useEffect(() => { const to = height - hs[detent]; cur.current = to; springTo(y, to, 'soft', Platform.OS !== 'web').start(); }, [detent, height]); // eslint-disable-line react-hooks/exhaustive-deps
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => y.setValue(Math.max(height - hs[2], Math.min(height - hs[0] + 40, cur.current + g.dy))),
    onPanResponderRelease: (_, g) => {
      const at = cur.current + g.dy + g.vy * 120;
      let best = 0, d = Infinity;
      hs.forEach((h, i) => { const dd = Math.abs(height - h - at); if (dd < d) { d = dd; best = i; } });
      if (best === detent) { springTo(y, height - hs[detent], 'soft', Platform.OS !== 'web').start(); } else onDetent(best);
    },
  })).current;
  if (!height) return null;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY: y }] }, liftStrong]}>
      <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8, ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none' } as object) : {}) }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
      </View>
      {children}
    </Animated.View>
  );
}
