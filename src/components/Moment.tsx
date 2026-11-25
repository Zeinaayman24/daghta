import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Mark } from './Brand';
import { Btn, T } from './ui';
import { dur, ease, reducedMotion, spring } from '@/lib/motion';
import { brand } from '@/lib/theme';
import { dir } from '@/lib/i18n';

/**
 * A branded moment: the screen fills with navy (request sent) or lime (handover), the mark turns in and presses once,
 * three speed lines sweep past, then the text rises. One of the three places the full gear appears as motion.
 * Under reduced motion it is a plain fade.
 */
export function Moment({ tone = 'navy', title, text, button, onDone }: {
  tone?: 'navy' | 'lime'; title: string; text?: string; button?: { label: string; onPress: () => void }; onDone?: () => void;
}) {
  const native = Platform.OS !== 'web';
  const bg = tone === 'navy' ? brand.navy : brand.lime;
  const fg = tone === 'navy' ? '#FFFFFF' : brand.navy;
  const fill = useRef(new Animated.Value(0)).current;
  const mark = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const lines = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const text1 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      Animated.timing(fill, { toValue: 1, duration: 150, useNativeDriver: native }).start();
      mark.setValue(1); text1.setValue(1); lines.forEach((l) => l.setValue(1));
      const tm = setTimeout(() => onDone?.(), 1200); return () => clearTimeout(tm);
    }
    Animated.sequence([
      Animated.timing(fill, { toValue: 1, duration: 500, easing: ease.out, useNativeDriver: native }),
      Animated.spring(mark, { toValue: 1, ...spring.bouncy, useNativeDriver: native }),
      Animated.sequence([Animated.timing(press, { toValue: 0.86, duration: dur.instant, easing: ease.out, useNativeDriver: native }), Animated.spring(press, { toValue: 1, ...spring.bouncy, useNativeDriver: native })]),
      Animated.parallel([
        Animated.stagger(60, lines.map((l) => Animated.timing(l, { toValue: 1, duration: 520, easing: ease.out, useNativeDriver: native }))),
        Animated.timing(text1, { toValue: 1, duration: 320, delay: 150, easing: ease.out, useNativeDriver: native }),
      ]),
    ]).start(() => { const tm = setTimeout(() => onDone?.(), 900); return () => clearTimeout(tm); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sweep = dir() === 'rtl' ? -1 : 1;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18, zIndex: 20, opacity: fill, transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }] }]}>
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
        {lines.map((l, i) => (
          <Animated.View key={i} style={{ position: 'absolute', top: 36 + i * 22, left: -60, width: [52, 76, 44][i], height: 5, borderRadius: 3, backgroundColor: tone === 'navy' ? brand.lime : brand.navy,
            opacity: l.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }), transform: [{ translateX: l.interpolate({ inputRange: [0, 1], outputRange: [0, sweep * 260] }) }] }} />
        ))}
        <Animated.View style={{ opacity: mark, transform: [{ scale: Animated.multiply(mark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), press) }, { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
          <Mark size={120} bg={bg} fg={fg} />
        </Animated.View>
      </View>
      <Animated.View style={{ alignItems: 'center', gap: 8, opacity: text1, transform: [{ translateY: text1.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <T w="display" size={24} color={fg} center>{title}</T>
        {text ? <T size={14.5} color={tone === 'navy' ? 'rgba(255,255,255,.75)' : '#1E3A0A'} center style={{ maxWidth: 320 }}>{text}</T> : null}
        {button ? <Btn title={button.label} onPress={button.onPress} kind={tone === 'navy' ? 'primary' : 'dark'} style={{ width: 200, marginTop: 10 }} /> : null}
      </Animated.View>
    </Animated.View>
  );
}
