import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Easing, FlatList, Image, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FILLED, LINE } from './icons';
import { bp, brand, colors, fontWeights, fonts, lift, liftStrong, radius } from '@/lib/theme';
import { dur, ease, enter, reducedMotion, springTo } from '@/lib/motion';
import { dir, flipIcon, startAlign, t as tr } from '@/lib/i18n';

/* ---------------------------------------------------------------- text */
type W = 'regular' | 'medium' | 'semibold' | 'bold' | 'display' | 'displayBold';
/** Text. `display` is Alexandria (titles, prices, big numbers); everything else is IBM Plex Sans Arabic. */
export function T({ children, w = 'regular', size = 15, color = colors.ink, center, style, selectable, numberOfLines }: {
  children: ReactNode; w?: W; size?: number; color?: string; center?: boolean;
  style?: StyleProp<TextStyle>; selectable?: boolean; numberOfLines?: number;
}) {
  return (
    <Text selectable={selectable} numberOfLines={numberOfLines}
      style={[{ fontFamily: fonts[w], fontWeight: fontWeights[w], fontSize: size, color, lineHeight: Math.round(size * (w === 'display' || w === 'displayBold' ? 1.3 : 1.55)), writingDirection: dir() }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}
export const Muted = (p: { children: ReactNode; size?: number; center?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) =>
  <T size={p.size ?? 13} color={colors.muted} center={p.center} style={p.style} numberOfLines={p.numberOfLines}>{p.children}</T>;

export const Title = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => (
  <View style={{ gap: 4 }}>
    <T w="display" size={28} style={{ lineHeight: 38, letterSpacing: -0.2 }}>{children}</T>
    {sub ? <Muted size={14}>{sub}</Muted> : null}
  </View>
);

/* ---------------------------------------------------------------- touch */
const tick = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

/** A pressable that gives back: it sinks slightly under the finger and ticks on phones. */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Press({ children, onPress, style, disabled, label, role = 'button', hitSlop, selected, dim = true }: {
  dim?: boolean;
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; label?: string;
  role?: 'button' | 'link' | 'tab' | 'imagebutton'; hitSlop?: number; selected?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  // the press: sinks to 0.96 in 80 ms, springs back (snappy) on release
  const to = (v: number) => (v < 1 ? Animated.timing(scale, { toValue: v, duration: dur.instant, easing: ease.out, useNativeDriver: Platform.OS !== 'web' }) : springTo(scale, 1, 'snappy')).start();
  return (
    <AnimatedPressable onPress={() => { tick(); onPress?.(); }} disabled={disabled || !onPress} accessibilityRole={role} accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }} hitSlop={hitSlop}
      onPressIn={() => to(reducedMotion() ? 1 : 0.96)} onPressOut={() => to(1)}
      style={[style as any, { transform: [{ scale }] }, disabled && dim && { opacity: 0.45 }]}>
      {children}
    </AnimatedPressable>
  );
}

/* ---------------------------------------------------------------- layout */
/**
 * A screen: optional full-width `top` (heroes), scrolling content in a centred column,
 * and either a pinned action bar (`footer`) or the floating tab bar (`nav`).
 */
export function Screen({ children, header, footer, nav, top, topColor }: { children: ReactNode; header?: ReactNode; footer?: ReactNode; nav?: ReactNode; top?: ReactNode; topColor?: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= bp.desktop;
  // a detail screen's BackBar (in the header slot or first in the body) turns the top of the screen into a navy band
  const [band, setBand] = useState(false);
  // every screen rises in (16 px, soft spring); reduced motion makes it a crossfade
  const op = useRef(new Animated.Value(0)).current, y = useRef(new Animated.Value(12)).current;
  useEffect(() => { enter(op, y).start(); }, [op, y]);
  const content = (
    <Animated.View style={{ flex: 1, opacity: op, transform: [{ translateY: y }] }}>
      {!top ? (
        <View style={{ paddingTop: insets.top, backgroundColor: band ? colors.brand : colors.ground, zIndex: 3 }}>
          {header ? <BandCtx.Provider value={{ setBand, place: 'header', wide }}><View style={[s.column, wide && s.columnWide, { paddingTop: 8 }]}>{header}</View></BandCtx.Provider> : null}
        </View>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* the space under the clock takes the hero's colour, so the hero starts at the very top of the screen */}
        {top ? <View style={{ paddingTop: insets.top, backgroundColor: topColor, borderBottomLeftRadius: topColor && !wide ? 28 : 0, borderBottomRightRadius: topColor && !wide ? 28 : 0 }}>{top}</View> : null}
        <BandCtx.Provider value={{ setBand, place: 'body', wide }}>
          <View style={[s.column, wide && s.columnWide, s.body, { paddingBottom: nav && !wide ? 36 : footer ? 28 : insets.bottom + 40 }]}>{children}</View>
        </BandCtx.Provider>
      </ScrollView>
      {footer ? (
        <View style={[{ backgroundColor: colors.surface, paddingBottom: insets.bottom + 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.line }, liftStrong]}>
          <View style={[s.column, wide && s.columnWide, { gap: 8 }]}>{footer}</View>
        </View>
      ) : null}
      {nav && !wide ? (
        // Docked under the scroll area, so content stops above the tabs instead of sliding behind them.
        <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line, paddingBottom: Math.max(insets.bottom, 6), zIndex: 2 }}>
          <View style={[s.column, { paddingHorizontal: 8 }]}>{nav}</View>
        </View>
      ) : null}
      <ToastHost bottom={nav && !wide ? 96 : footer ? 100 : 16} />
    </Animated.View>
  );
  if (nav && wide) {
    // desktop and tablet: the same four items as a rail on the start side, content in a wider column
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.ground }}>
        <View style={{ width: 92, backgroundColor: colors.brand, paddingTop: insets.top + 16 }}>{nav}</View>
        <View style={{ flex: 1, minWidth: 0 }}>{content}</View>
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: colors.ground }}>{content}</View>;
}

type IconSet = 'ion' | 'mci';
/**
 * Icons: clean line icons (Lucide) for the interface, MaterialCommunityIcons for car parts.
 * Screens keep using Ionicons-style names; "-outline" is ignored because every interface icon is a line icon.
 */
export function Icon({ name: raw, size = 22, color = colors.ink, set = 'ion', stroke }: { name: string; size?: number; color?: string; set?: IconSet; stroke?: number }) {
  const name = flipIcon(raw);
  if (set === 'mci') return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  const outline = name.endsWith('-outline');
  const base = outline ? name.slice(0, -8) : name;
  const L = LINE[base];
  if (L) return <L size={size} color={color} strokeWidth={stroke ?? (size <= 16 ? 2.2 : 1.9)} fill={!outline && FILLED.has(base) ? color : 'none'} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

/** A white card lifted off the ground. */
export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (onPress) return <Press onPress={onPress} style={[s.card, style]}>{children}</Press>;
  return <View style={[s.card, style]}>{children}</View>;
}

/** Section heading with an optional action on the far side. */
export function Section({ title, note, action, children }: { title: string; note?: string; action?: { label: string; onPress: () => void }; children?: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T w="displayBold" size={17}>{title}</T>
        {action ? <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="link"><Row gap={2}><T size={13} w="semibold" color={colors.primaryText}>{action.label}</T><Icon name="chevron-back" size={14} color={colors.primaryText} /></Row></Pressable>
          : note ? <Muted>{note}</Muted> : null}
      </Row>
      {children}
    </View>
  );
}

/** One line in a list: optional leading image, title, subtitle, trailing element, hairline under it. */
export function ListRow({ title, subtitle, meta, leading, trailing, onPress, last }: {
  title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void; last?: boolean;
}) {
  const inner = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }, !last && { borderBottomWidth: 1, borderColor: colors.line }]}>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <T w="semibold" numberOfLines={1}>{title}</T> : title}
        {subtitle ? (typeof subtitle === 'string' ? <Muted numberOfLines={1}>{subtitle}</Muted> : subtitle) : null}
        {meta ? (typeof meta === 'string' ? <Muted size={12} style={{ color: colors.faint }}>{meta}</Muted> : meta) : null}
      </View>
      {trailing}
      {onPress ? <Icon name="chevron-back" size={16} color={colors.faint} /> : null}
    </View>
  );
  if (!onPress) return inner;
  return <Press onPress={onPress}>{inner}</Press>;
}

export function IconButton({ name, onPress, label, tone = 'white', size = 42, set }: {
  name: string; onPress: () => void; label: string; tone?: 'white' | 'ink' | 'clear'; size?: number; set?: IconSet;
}) {
  const bg = tone === 'ink' ? colors.brand : tone === 'clear' ? 'rgba(255,255,255,.14)' : colors.surface;
  return (
    <Press onPress={onPress} label={label} hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        tone === 'white' && { borderWidth: 1, borderColor: colors.line }, tone === 'clear' && { borderWidth: 1, borderColor: 'rgba(255,255,255,.14)' }]}>
      <Icon name={name} set={set} size={Math.round(size * 0.46)} color={tone === 'white' ? colors.ink : '#fff'} />
    </Press>
  );
}

const BandCtx = createContext<{ setBand: (on: boolean) => void; place: 'header' | 'body'; wide: boolean }>({ setBand: () => {}, place: 'body', wide: false });
/**
 * The header of a detail screen: a navy band across the top with the title in white.
 * It works from the header slot or as the first thing in the body; either way it bleeds to the screen edges.
 */
export function BackBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { setBand, place, wide } = useContext(BandCtx);
  useLayoutEffect(() => { setBand(true); return () => setBand(false); }, [setBand]);
  const gutter = wide ? 32 : 20;
  const pull = place === 'body' ? 18 : 8;
  return (
    <View style={{ marginHorizontal: -gutter, marginTop: -pull, paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 16, backgroundColor: colors.brand, borderBottomLeftRadius: wide ? 0 : 24, borderBottomRightRadius: wide ? 0 : 24 }}>
      <Row style={{ minHeight: 48 }} gap={12}>
        <IconButton name="chevron-forward" onPress={onBack} label={tr('رجوع')} size={40} tone="clear" />
        <T w="displayBold" size={19} color="#fff" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
      </Row>
    </View>
  );
}

/* ---------------------------------------------------------------- buttons */
type Kind = 'primary' | 'accent' | 'secondary' | 'dark' | 'danger' | 'small' | 'link';
export function Btn({ title, onPress, kind = 'primary', disabled, loading, style, icon }: {
  title: string; onPress: () => void; kind?: Kind; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; icon?: string;
}) {
  const k = btnStyles[kind];
  // a filled button that can't be pressed yet turns plain grey instead of a faded blue
  const off = !!disabled && !loading && (kind === 'primary' || kind === 'accent' || kind === 'dark');
  const color = off ? colors.faint : k.color;
  return (
    <Press onPress={onPress} disabled={disabled || loading} dim={!off} style={[k.box, off && { backgroundColor: '#E3E8EF', borderColor: '#E3E8EF' }, style]}>
      {loading ? <ActivityIndicator color={k.color} /> : (
        <Row gap={8} style={{ justifyContent: 'center' }}>
          {icon ? <Icon name={icon} size={k.size + 3} color={color} stroke={2.2} /> : null}
          <T w={kind === 'primary' || kind === 'accent' || kind === 'dark' ? 'display' : 'semibold'} size={k.size} color={color} center>{title}</T>
        </Row>
      )}
    </Press>
  );
}

/* ---------------------------------------------------------------- inputs */
export function Field({ label, value, onChangeText, placeholder, keyboardType, ltr, multiline, secure, hint, big, icon }: {
  label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address'; ltr?: boolean; multiline?: boolean; secure?: boolean; hint?: string; big?: boolean; icon?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <T w="medium" size={13} color={colors.muted}>{label}</T> : null}
      <View style={[s.inputBox, focus && s.inputFocus, multiline && { alignItems: 'flex-start' }]}>
        {icon ? <Icon name={icon} size={19} color={focus ? colors.primaryText : colors.faint} /> : null}
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint}
          keyboardType={keyboardType} secureTextEntry={secure} multiline={multiline}
          autoCapitalize="none" autoCorrect={!ltr} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={[s.input, big && { fontSize: 22, fontFamily: fonts.display, fontWeight: fontWeights.display as any }, multiline && { minHeight: 84, textAlignVertical: 'top' },
            ltr ? { writingDirection: 'ltr', textAlign: startAlign() } : { textAlign: startAlign() }, { outlineStyle: 'none' } as any]}
        />
      </View>
      {hint ? <Muted size={12}>{hint}</Muted> : null}
    </View>
  );
}

export function Chips<V extends string | number>({ options, selected, onPick }: {
  options: { v: V; label: string; icon?: string }[]; selected: V[]; onPick: (v: V) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = selected.includes(o.v);
        return (
          <Press key={String(o.v)} onPress={() => onPick(o.v)} selected={on}
            style={[s.chip, on && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
            <Row gap={6}>
              {on ? <View style={s.tick}><Icon name="checkmark" size={11} color={colors.brand} stroke={3} /></View> : o.icon ? <Icon name={o.icon} size={15} color={colors.muted} /> : null}
              <T size={14} w={on ? 'semibold' : 'medium'} color={on ? '#fff' : colors.ink}>{o.label}</T>
            </Row>
          </Press>
        );
      })}
    </View>
  );
}

export function Seg<V extends string | number>({ options, value, onPick }: { options: { v: V; label: string }[]; value: V; onPick: (v: V) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable key={String(o.v)} onPress={() => { tick(); onPick(o.v); }} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[s.segBtn, on && s.segOn]}>
            <T size={14.5} w={on ? 'semibold' : 'medium'} color={on ? '#fff' : colors.muted} center>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ gap: 8 }}><T w="medium" size={13} color={colors.muted}>{label}</T>{children}</View>;
}

/** A sheet that rises from the bottom (centred card on wide screens). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetBackdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={s.grabber} />
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <T w="displayBold" size={19}>{title}</T>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={tr('اقفل')} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={18} color={colors.ink} /></Pressable>
          </Row>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A tap-to-open list picker that works the same on web and phones. */
export function Select<V extends string | number>({ label, value, options, onPick }: {
  label: string; value: V; options: { v: V; label: string }[]; onPick: (v: V) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.v === value);
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <T w="medium" size={13} color={colors.muted}>{label}</T>
      <Press onPress={() => setOpen(true)} style={[s.inputBox, { justifyContent: 'space-between', paddingVertical: 13 }]}>
        <T w="medium">{current?.label ?? '—'}</T><Icon name="chevron-down" size={16} color={colors.faint} />
      </Press>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <FlatList data={options} keyExtractor={(o) => String(o.v)} style={{ maxHeight: 440 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onPick(item.v); setOpen(false); }}
              style={[s.option, item.v === value && { backgroundColor: colors.soft }]}>
              <T w={item.v === value ? 'semibold' : 'regular'}>{item.label}</T>
              {item.v === value ? <Icon name="checkmark" size={18} /> : null}
            </Pressable>
          )} />
      </Sheet>
    </View>
  );
}

/* ---------------------------------------------------------------- bits */
type Tone = 'new' | 'good' | 'wait' | 'plain' | 'bad' | 'accent';
export function Pill({ label, tone = 'plain', icon }: { label: string; tone?: Tone; icon?: string }) {
  const bg = { new: colors.primarySoft, good: colors.goodSoft, wait: colors.warnSoft, plain: colors.soft, bad: colors.badSoft, accent: colors.primarySoft }[tone];
  const fg = { new: colors.primaryText, good: colors.good, wait: colors.warn, plain: colors.muted, bad: colors.bad, accent: colors.primaryText }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <T size={12} w="semibold" color={fg} style={{ lineHeight: 17 }}>{label}</T>
    </View>
  );
}

export const Notice = ({ children, icon = 'information-circle' }: { children: ReactNode; icon?: string }) => (
  <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
    <Icon name={icon} size={20} color={colors.primaryText} />
    <View style={{ flex: 1, gap: 2 }}>{typeof children === 'string' ? <T size={14}>{children}</T> : children}</View>
  </View>
);

export const Empty = ({ text, icon = 'file-tray-outline', action }: { text: string; icon?: string; action?: { label: string; onPress: () => void } }) => (
  <View style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
    <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon.length <= 2 ? 'file-tray-outline' : icon} size={34} color={colors.brand} stroke={1.6} />
    </View>
    <Muted center size={14}>{text}</Muted>
    {action ? <Btn kind="small" title={action.label} onPress={action.onPress} style={{ alignSelf: 'center' }} /> : null}
  </View>
);

export const ErrorText = ({ text }: { text?: string | null }) => (text ? (
  <Row gap={6}><Icon name="alert-circle" size={16} color={colors.bad} /><T size={13} w="medium" color={colors.bad} style={{ flex: 1 }}>{text}</T></Row>
) : null);

/** Numbers in a lifted strip. */
export function Stats({ items }: { items: [string, string][] }) {
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 16 }, lift]}>
      {items.map(([v, l], i) => (
        <View key={i} style={[{ flex: 1, paddingHorizontal: 14, gap: 2 }, i > 0 && { borderStartWidth: 1, borderColor: colors.line }]}>
          <T w="display" size={22}>{v}</T>
          <Muted size={12}>{l}</Muted>
        </View>
      ))}
    </View>
  );
}

export function Photo({ uri, size = 72 }: { uri?: string | null; size?: number }) {
  const [big, setBig] = useState(false);
  if (!uri) return <View style={[s.photo, { width: size, height: size }]}><Icon set="mci" name="car-wrench" size={Math.round(size / 2.4)} color={colors.faint} /></View>;
  return (
    <>
      <Pressable onPress={() => setBig(true)} accessibilityRole="imagebutton" accessibilityLabel={tr('كبّر الصورة')}>
        <Image source={{ uri }} style={[s.photo, { width: size, height: size }]} accessibilityLabel={tr('صورة القطعة')} />
      </Pressable>
      <Modal visible={big} transparent animationType="fade" onRequestClose={() => setBig(false)}>
        <Pressable style={[s.backdrop, { backgroundColor: 'rgba(10,12,18,.92)' }]} onPress={() => setBig(false)}>
          <Image source={{ uri }} style={{ width: '94%', height: '80%' }} resizeMode="contain" accessibilityLabel={tr('صورة القطعة')} />
        </Pressable>
      </Modal>
    </>
  );
}

export function PhotoPicker({ uri, onPick, hint }: { uri: string | null; onPick: () => void; hint: string }) {
  return (
    <Press onPress={onPick} style={s.upload}>
      {uri ? <Image source={{ uri }} style={[s.photo, { width: 56, height: 56 }]} /> : (
        <View style={[s.photo, { width: 56, height: 56, backgroundColor: colors.primarySoft }]}><Icon name="camera" size={24} color={colors.primaryText} /></View>
      )}
      <View style={{ flex: 1 }}>
        <T w="semibold" size={14}>{uri ? tr('الصورة اتضافت') : tr('ضيف صورة')}</T>
        <Muted size={12}>{uri ? tr('اضغط لو عايز تغيّرها') : hint}</Muted>
      </View>
    </Press>
  );
}

/** Skeleton blocks that shimmer while data loads. */
export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(a, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: '#E3E8EF', opacity: a }, style]} />;
}

export function Loading() {
  return (
    <View style={{ gap: 14, paddingTop: 8 }} accessibilityLabel={tr('بيحمّل')}>
      <Skeleton h={28} w="55%" />
      <Skeleton h={120} r={20} />
      <Skeleton h={84} r={20} />
      <Skeleton h={84} r={20} />
    </View>
  );
}

/** A vertical progress line: done steps filled, the current one ringed. */
export function Steps({ items, current = -1 }: { items: string[]; current?: number }) {
  return (
    <View style={{ gap: 0 }}>
      {items.map((t, i) => {
        const done = current >= 0 && i < current; const now = i === current;
        return (
          <Row key={i} style={{ alignItems: 'flex-start' }} gap={12}>
            <View style={{ alignItems: 'center', width: 26 }}>
              <View style={[s.stepNum, (done || current < 0) && { backgroundColor: colors.lime }, now && { backgroundColor: colors.surface, borderWidth: 2.5, borderColor: colors.primary }]}>
                {done ? <Icon name="checkmark" size={14} color={colors.brand} stroke={3} /> : now ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : <T w="bold" size={12} color={current < 0 ? colors.brand : colors.faint}>{[tr('١'), tr('٢'), tr('٣'), tr('٤'), tr('٥'), tr('٦')][i]}</T>}
              </View>
              {i < items.length - 1 ? <View style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: done ? colors.lime : colors.line }} /> : null}
            </View>
            <T size={15} w={now ? 'bold' : done ? 'medium' : 'regular'} color={done || now || current < 0 ? colors.ink : colors.faint} style={{ flex: 1, paddingTop: 2 }}>{t}</T>
          </Row>
        );
      })}
    </View>
  );
}

/**
 * The signature element: an Egyptian private-car licence plate.
 * Used for the customer's car and for order numbers.
 */
export function Plate({ top, bottom, size = 'md' }: { top: string; bottom: string; size?: 'sm' | 'md' | 'lg' }) {
  const k = { sm: { w: 92, f: 12, b: 7 }, md: { w: 118, f: 14, b: 8 }, lg: { w: 150, f: 18, b: 9 } }[size];
  return (
    <View style={[s.plate, { width: k.w }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={s.plateTop}><T size={k.b} w="bold" color={colors.ink} style={{ lineHeight: k.b + 5 }}>{tr('مصر')}</T><T size={k.b} w="bold" color={colors.ink} style={{ lineHeight: k.b + 5 }}>EGYPT</T></View>
      <View style={{ flexDirection: 'row', paddingVertical: 1 }}>
        <View style={{ flex: 1, alignItems: 'center' }}><T w="bold" size={k.f} numberOfLines={1}>{top}</T></View>
        <View style={{ flex: 1, alignItems: 'center', borderStartWidth: 1.5, borderColor: colors.ink }}><T w="bold" size={k.f} numberOfLines={1}>{bottom}</T></View>
      </View>
    </View>
  );
}

export function Lines({ rows, total }: { rows: [string, string][]; total?: [string, string] }) {
  return (
    <View style={{ gap: 10 }}>
      {rows.map(([a, b], i) => <Row key={i} style={{ justifyContent: 'space-between' }}><Muted size={14}>{a}</Muted><T size={14}>{b}</T></Row>)}
      {total ? <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.line, borderStyle: 'dashed', paddingTop: 10 }}><T w="displayBold" size={17}>{total[0]}</T><T w="display" size={18}>{total[1]}</T></Row> : null}
    </View>
  );
}

/** Text the person can select and copy, shown left-to-right (phone numbers). */
export function CopyBox({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: colors.soft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 }}>
      <T selectable w="display" size={17} style={{ writingDirection: 'ltr', textAlign: startAlign(), letterSpacing: 0.5 }}>{text}</T>
    </View>
  );
}

/* ---------------------------------------------------------------- toast */
let pushToast: ((m: string) => void) | null = null;
export const toast = (m: string) => pushToast?.(m);

export function ToastHost({ bottom }: { bottom: number }) {
  const [msg, setMsg] = useState('');
  const y = useRef(new Animated.Value(30)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    pushToast = (m) => {
      setMsg(m); y.setValue(30);
      springTo(y, 0, 'soft').start();
      clearTimeout(t); t = setTimeout(() => setMsg(''), 3500);
    };
    return () => { pushToast = null; clearTimeout(t); };
  }, [y]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.toast, liftStrong, { bottom: insets.bottom + bottom, transform: [{ translateY: y }] }]} accessibilityLiveRegion="polite">
      <Icon name="checkmark-circle" size={20} color={colors.lime} />
      <T color={colors.brandInk} w="medium" size={14} style={{ flex: 1 }}>{msg}</T>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- styles */
const base: ViewStyle = { borderRadius: 16, minHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 };
const btnStyles: Record<Kind, { box: ViewStyle; color: string; size: number }> = {
  primary: { box: { ...base, backgroundColor: colors.primary }, color: colors.primaryInk, size: 17 },
  accent: { box: { ...base, backgroundColor: colors.primary }, color: colors.primaryInk, size: 17 },
  dark: { box: { ...base, minHeight: 50, borderRadius: 14, backgroundColor: colors.brand }, color: colors.brandInk, size: 16 },
  secondary: { box: { ...base, minHeight: 52, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand }, color: colors.brand, size: 15 },
  danger: { box: { ...base, minHeight: 46, backgroundColor: 'transparent' }, color: colors.bad, size: 15 },
  small: { box: { backgroundColor: colors.primarySoft, borderRadius: 999, minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, alignSelf: 'flex-start' }, color: colors.primaryText, size: 14 },
  link: { box: { paddingVertical: 4, alignSelf: 'flex-start' }, color: colors.primaryText, size: 13.5 },
};

const s = StyleSheet.create({
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20 },
  columnWide: { maxWidth: 680, paddingHorizontal: 32 },
  body: { flexGrow: 1, paddingTop: 18, gap: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, gap: 12, ...lift },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 52 },
  inputFocus: { borderColor: colors.primary, backgroundColor: colors.surface, ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 0 4px ${brand.skySoft}` } as object) : {}) },
  input: { flex: 1, fontFamily: fonts.medium, fontWeight: fontWeights.medium as any, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  chip: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, minHeight: 42, justifyContent: 'center' },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.soft, borderRadius: 999, padding: 4, gap: 4 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 9 },
  segOn: { backgroundColor: colors.brand },
  backdrop: { flex: 1, backgroundColor: 'rgba(4,29,63,.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(4,29,63,.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, paddingTop: 10, width: '100%', maxWidth: 560, ...liftStrong },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 12 },
  option: { paddingVertical: 13, paddingHorizontal: 12, borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photo: { borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 12, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#B9C4D3', borderStyle: 'dashed' },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  plate: { borderWidth: 2, borderColor: colors.brand, borderRadius: 7, overflow: 'hidden', backgroundColor: '#fff' },
  plateTop: { backgroundColor: colors.plate, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 7 },
  toast: { position: 'absolute', left: 20, right: 20, alignSelf: 'center', maxWidth: 520, backgroundColor: colors.brand, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
});

/* ---------------------------------------------------------------- slide to confirm */
/**
 * A deliberate confirm: drag the knob across the track. Used where a mis-tap would cost money.
 * In RTL the knob starts on the right and travels left.
 */
export function SlideToConfirm({ label, onConfirm, busy }: { label: string; onConfirm: () => void; busy?: boolean }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const knob = 52;
  const max = Math.max(0, w - knob - 8);
  const done = useRef(false);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !done.current,
    onMoveShouldSetPanResponder: (_, g) => !done.current && Math.abs(g.dx) > 4,
    onPanResponderMove: (_, g) => x.setValue(Math.min(maxRef.current, Math.max(0, -g.dx))),
    onPanResponderRelease: (_, g) => {
      if (-g.dx > maxRef.current * 0.85) {
        done.current = true;
        Animated.timing(x, { toValue: maxRef.current, duration: 120, useNativeDriver: false }).start();
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onConfirmRef.current();
      } else Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
    },
  })).current;
  const maxRef = useRef(max); maxRef.current = max;
  const onConfirmRef = useRef(onConfirm); onConfirmRef.current = onConfirm;
  useEffect(() => { if (!busy && done.current) { done.current = false; Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(); } }, [busy, x]);
  const fill = x.interpolate({ inputRange: [0, Math.max(1, max)], outputRange: [knob + 8, Math.max(knob + 8, w)] });
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="button" accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => onConfirm()}
      style={{ height: 60, borderRadius: 16, backgroundColor: colors.brand, justifyContent: 'center', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: fill, backgroundColor: colors.lime, borderRadius: 16 }} />
      <T w="semibold" size={15.5} color="#fff" center style={{ paddingHorizontal: knob + 16 }}>{busy ? tr('بنأكد…') : label}</T>
      <Animated.View {...pan.panHandlers}
        style={{ position: 'absolute', right: 4, width: knob, height: knob, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: Animated.multiply(x, -1) }], ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : {}) }}>
        {busy ? <ActivityIndicator color={colors.brand} /> : <Icon name="chevron-back" size={26} color={colors.brand} />}
      </Animated.View>
    </View>
  );
}

/** A row of tabs that scrolls sideways; each tab can carry a small status mark. */
export function TabPills<V extends string>({ items, value, onPick }: {
  items: { v: V; label: string; mark?: { icon: string; color: string } | { count: number } }[]; value: V; onPick: (v: V) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2, alignItems: 'center' }}>
      {items.map((it) => {
        const on = it.v === value;
        return (
          <Press key={it.v} onPress={() => onPick(it.v)} role="tab" selected={on}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 12, borderWidth: 1,
              backgroundColor: on ? colors.brand : colors.surface, borderColor: on ? colors.brand : colors.line }}>
            <T size={13.5} w={on ? 'semibold' : 'medium'} color={on ? '#fff' : colors.ink} numberOfLines={1}>{it.label}</T>
            {it.mark && 'count' in it.mark ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: on ? colors.lime : colors.brand, alignItems: 'center', justifyContent: 'center' }}>
                <T size={11} w="bold" color={on ? colors.brand : '#fff'} style={{ lineHeight: 15 }}>{String(it.mark.count)}</T>
              </View>
            ) : it.mark ? <Icon name={it.mark.icon} size={16} color={it.mark.color} /> : null}
          </Press>
        );
      })}
    </ScrollView>
  );
}

/**
 * On/off switch, drawn the same on every platform (the built-in one looks broken in the web app).
 * The knob sits at the end side when on: right in English, left in Arabic, like iPhone settings.
 */
export function Toggle({ value, onValueChange, disabled, onColor = colors.primary, offColor = "#C3CCD8", accessibilityLabel }: {
  value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; onColor?: string; offColor?: string; accessibilityLabel?: string;
}) {
  const pos = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { springTo(pos, value ? 1 : 0, 'snappy').start(); }, [value, pos]);
  const W = 51, H = 31, K = 27, travel = W - K - 4;
  const sign = dir() === 'rtl' ? -1 : 1;
  return (
    <Pressable onPress={() => !disabled && onValueChange(!value)} disabled={disabled} hitSlop={8}
      accessibilityRole="switch" accessibilityState={{ checked: value, disabled: !!disabled }} accessibilityLabel={accessibilityLabel}
      style={{ width: W, height: H, borderRadius: H / 2, backgroundColor: value ? onColor : offColor, justifyContent: 'center', opacity: disabled ? 0.5 : 1, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: W, height: H, justifyContent: 'center', alignItems: sign > 0 ? 'flex-start' : 'flex-end', paddingHorizontal: 2, direction: 'ltr' }}>
        <Animated.View style={{ width: K, height: K, borderRadius: K / 2, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          transform: [{ translateX: pos.interpolate({ inputRange: [0, 1], outputRange: [0, sign * travel] }) }] }} />
      </View>
    </Pressable>
  );
}
