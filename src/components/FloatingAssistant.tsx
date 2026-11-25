import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import Assistant from '@/app/assistant';
import { useAuth } from '@/lib/auth';
import { useIntroRunning } from '@/lib/intro';
import { dur, ease, reducedMotion, springTo } from '@/lib/motion';
import { bp, brand, colors, liftStrong } from '@/lib/theme';
import { t } from '@/lib/i18n';
import { Mark } from './Brand';

const SIZE = 56, EDGE = 16;
/** Screens where the bubble would be in the way: sign-in, the opening, forms in progress, chats and the assistant itself. */
const HIDE = ['/', '/welcome', '/login', '/assistant', '/shop-setup', '/delete-account', '/customer/new', '/install/new', '/admin', '/manage', '/privacy'];
const hideOn = (p: string) => HIDE.includes(p) || p.startsWith('/chat') || p.startsWith('/ticket') || p.startsWith('/legal');

/** Where the bubble rests: which side, and how far up. Remembered for the session (and on the web, across visits). */
let rest: { side: 'start' | 'end'; y: number | null } = { side: 'start', y: null };
if (Platform.OS === 'web') { try { const v = localStorage.getItem('daghta-bubble'); if (v) rest = JSON.parse(v); } catch { /* fine */ } }
const remember = () => { if (Platform.OS === 'web') { try { localStorage.setItem('daghta-bubble', JSON.stringify(rest)); } catch { /* fine */ } } };

let pulseFn: (() => void) | null = null;
/** One attention pulse on the bubble (a ring expands once and the unread dot shows). Never continuous. */
export const pulseAssistant = () => pulseFn?.();

/**
 * The floating assistant: a draggable bubble on every main screen that opens the assistant in a sheet.
 * Drag it anywhere; on release it springs to the nearest edge and remembers its place. Tap to open; the sheet grows
 * from the bubble. Minimise keeps the conversation. It is the same assistant as /assistant, with the same honest labels.
 */
export function FloatingAssistant() {
  const { session } = useAuth();
  const path = usePathname();
  const intro = useIntroRunning();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= bp.desktop;
  const rtl = t('رجوع') === 'رجوع';
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const held = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const cur = useRef({ x: 0, y: 0 });
  const bottomBar = wide ? 24 : 84 + Math.max(insets.bottom, 6);

  // the resting spot from the remembered side and height
  const home = useCallback(() => {
    const left = (rest.side === 'start') !== rtl;
    const x = left ? EDGE + (wide ? 92 : 0) : width - SIZE - EDGE;
    const maxY = height - bottomBar - SIZE - 12, minY = insets.top + 72;
    const y = rest.y == null ? maxY : Math.min(maxY, Math.max(minY, rest.y));
    return { x, y };
  }, [rtl, wide, width, height, bottomBar, insets.top]);
  useEffect(() => { const h = home(); cur.current = h; pos.setValue(h); }, [home, pos]);

  // the idle breath: one 3.5% swell every 5.2 s, nothing else; off under reduced motion
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(3100), Animated.timing(breath, { toValue: 1.035, duration: 950, easing: ease.inOut, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(breath, { toValue: 1, duration: 1150, easing: ease.inOut, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start(); return () => loop.stop();
  }, [breath]);

  useEffect(() => {
    pulseFn = () => {
      setUnread(true);
      if (reducedMotion()) return;
      ring.setValue(0); Animated.timing(ring, { toValue: 1, duration: 900, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }).start();
    };
    return () => { pulseFn = null; };
  }, [ring]);

  // close the sheet when the person navigates (a chip inside the assistant can open a screen)
  useEffect(() => { setOpen(false); }, [path]);

  const openSheet = () => { setUnread(false); setOpen(true); sheet.setValue(0); springTo(sheet, 1, 'soft', false).start(); };
  const close = () => { Animated.timing(sheet, { toValue: 0, duration: reducedMotion() ? 120 : dur.base, easing: ease.in, useNativeDriver: false }).start(() => setOpen(false)); };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderGrant: () => { pos.stopAnimation(); Animated.timing(held, { toValue: reducedMotion() ? 1 : 1.08, duration: dur.fast, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }).start(); },
    onPanResponderMove: (_, g) => { pos.setValue({ x: cur.current.x + g.dx, y: cur.current.y + g.dy }); },
    onPanResponderRelease: (_, g) => {
      springTo(held, 1, 'snappy').start();
      const moved = Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
      if (!moved) { pos.setValue(cur.current); openSheet(); return; }
      // project the throw 120 ms ahead to choose the edge, keep the height, remember both
      const dims = dimsRef.current;
      const px = cur.current.x + g.dx + g.vx * 120, py = cur.current.y + g.dy + g.vy * 80;
      const left = px + SIZE / 2 < dims.width / 2;
      rest = { side: left !== dims.rtl ? 'start' : 'end', y: py }; remember();
      const target = dims.home();
      cur.current = target;
      const native = Platform.OS !== 'web';
      (reducedMotion() ? Animated.timing(pos, { toValue: target, duration: dur.fast, easing: ease.out, useNativeDriver: native })
        : Animated.spring(pos, { toValue: target, stiffness: 170, damping: 22, mass: 1, useNativeDriver: native })).start();
    },
  })).current;
  const dimsRef = useRef({ width, rtl, home }); dimsRef.current = { width, rtl, home };

  if (!session || intro || hideOn(path)) return null;
  const sheetH = wide ? 560 : Math.round(height * 0.72);
  const sheetW = wide ? 400 : width;
  const origin = cur.current;
  const sheetLeft = wide ? (rtl ? 24 : width - sheetW - 24) : 0;
  const sheetTop = height - sheetH - (wide ? 24 : 0);
  const ox = origin.x + SIZE / 2 - sheetLeft, oy = origin.y + SIZE / 2 - sheetTop;

  return (
    <>
      {open ? (
        <>
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: brand.navy, opacity: sheet.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }}>
            <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel={t('اقفل')} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: sheetLeft, top: sheetTop, width: sheetW, height: sheetH, backgroundColor: colors.surface, overflow: 'hidden',
            borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: wide ? 24 : 0, borderBottomRightRadius: wide ? 24 : 0,
            opacity: sheet, transform: [{ translateX: ox }, { translateY: oy }, { scale: sheet.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }, { translateX: -ox }, { translateY: -oy }] }, liftStrong]}>
            <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} /></View>
            <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0, bottom: wide ? 12 : insets.bottom }}>
              <View style={{ flex: 1 }}><Assistant embedded onClose={close} /></View>
            </SafeAreaInsetsContext.Provider>
          </Animated.View>
        </>
      ) : (
        <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel={t('مساعد ضغطة')}
          style={[{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: Animated.multiply(held, breath) }] }, Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none' } as object) : null]}>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -3, top: -3, width: SIZE + 6, height: SIZE + 6, borderRadius: (SIZE + 6) / 2, borderWidth: 3, borderColor: brand.sky,
            opacity: ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] }} />
          <View style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: brand.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: brand.sky }, liftStrong]}>
            <Mark size={32} />
          </View>
          {unread ? <View style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: brand.lime, borderWidth: 2.5, borderColor: '#fff' }} /> : null}
        </Animated.View>
      )}
    </>
  );
}
