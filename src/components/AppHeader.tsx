import { usePathname, useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { bp, colors } from '@/lib/theme';
import { springTo } from '@/lib/motion';
import { useInbox } from '@/lib/inbox';
import { ar } from '@/lib/data';
import { Icon, Press, T } from './ui';

export type Role = 'customer' | 'shop' | 'admin';

/** Remembers which side (customer or shop) the person last used, for people who have both. */
let lastRole: 'customer' | 'shop' | null = null;
export const rememberRole = (r: 'customer' | 'shop') => { lastRole = r; };
export function currentRole(p: { is_customer: boolean; is_shop: boolean } | null): 'customer' | 'shop' {
  if (lastRole) return lastRole;
  return p?.is_shop && !p?.is_customer ? 'shop' : 'customer';
}

/** Small top bar used on sign-in and setup screens. */
export function AppHeader(_: { role?: Role }) {
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center' }}>
      <Logo />
    </View>
  );
}

import { Logo, Mark } from './Brand';
import { t } from '@/lib/i18n';
export { Logo };

type Item = { href: string; label: string; icon: string; match: (p: string, tab?: string) => boolean; badge?: number };

/**
 * The main navigation: four items each for customers and shops.
 * Below 900 px it is the tab bar docked at the bottom; above, Screen places it as a rail on the start side.
 *   Customer: Home · Requests (parts, installation, bookings, orders; each one's chat lives inside it) · Shops · Account.
 *   Shop:     Inbox (new requests) · Work (orders being prepared, ready, done) · Messages · Shop.
 * Messages for customers stay one tap away: the inbox button in the home header and the row on the account screen.
 */
export function BottomNav({ role }: { role: 'customer' | 'shop' }) {
  const path = usePathname();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tabParam = typeof params.tab === 'string' ? params.tab : undefined;
  const { unread } = useInbox();
  const { width } = useWindowDimensions();
  const rail = width >= bp.desktop;
  const items: Item[] = role === 'customer'
    ? [
        { href: '/customer', label: t('الرئيسية'), icon: 'home', match: (p) => p === '/customer' },
        { href: '/customer/requests', label: t('طلباتي'), icon: 'receipt', match: (p) => (p.startsWith('/customer/') && p !== '/customer/new') || p.startsWith('/order') || p.startsWith('/install/') || p.startsWith('/booking') || p === '/messages' || p.startsWith('/chat'), badge: unread },
        { href: '/shops', label: t('المحلات'), icon: 'storefront', match: (p) => p === '/shops' || p.startsWith('/shop-profile') || p === '/favorites' },
        { href: '/account', label: t('حسابي'), icon: 'person', match: (p) => ['/account', '/profile', '/cars', '/support', '/notifications', '/privacy'].includes(p) },
      ]
    : [
        { href: '/shop', label: t('الوارد'), icon: 'file-tray-full', match: (p, tab) => p === '/shop' && !WORK.includes(tab ?? '') || (p.startsWith('/shop/') && !p.startsWith('/shop/order') && !p.startsWith('/shop/booking')) },
        { href: '/shop?tab=preparing', label: t('الشغل'), icon: 'construct', match: (p, tab) => (p === '/shop' && WORK.includes(tab ?? '')) || p.startsWith('/shop/order') || p.startsWith('/shop/booking') },
        { href: '/messages', label: t('الرسائل'), icon: 'chatbubbles', match: (p) => p === '/messages' || p.startsWith('/chat'), badge: unread },
        { href: '/account', label: t('المحل'), icon: 'storefront', match: (p) => ['/account', '/shop-setup', '/support', '/notifications', '/shop/balance', '/shop/performance', '/shop/services'].includes(p) },
      ];
  const go = (href: string) => router.replace(href as any);
  if (rail) {
    return (
      <View style={{ alignItems: 'center', gap: 6 }} accessibilityRole="tablist">
        <View style={{ marginBottom: 16 }}><Mark size={40} /></View>
        {items.map((it) => {
          const on = it.match(path, tabParam);
          return (
            <Press key={it.href} onPress={() => go(it.href)} role="tab" selected={on} label={it.label}
              style={{ width: 72, paddingVertical: 10, borderRadius: 14, alignItems: 'center', gap: 4, backgroundColor: on ? 'rgba(10,171,254,.18)' : 'transparent' }}>
              <View>
                <Icon name={it.icon} size={22} color={on ? colors.sky : 'rgba(255,255,255,.75)'} stroke={on ? 2.1 : 1.8} />
                <Badge n={it.badge} />
              </View>
              <T size={11} w={on ? 'semibold' : 'medium'} color={on ? '#fff' : 'rgba(255,255,255,.75)'} style={{ lineHeight: 15 }}>{it.label}</T>
            </Press>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface }} accessibilityRole="tablist">
      {items.map((it) => <Tab key={it.href} it={it} on={it.match(path, tabParam)} onPress={() => go(it.href)} />)}
    </View>
  );
}
const WORK = ['preparing', 'ready', 'done'];

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <View style={{ position: 'absolute', top: -5, right: -8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}>
      <T size={10} w="bold" color={colors.brand} style={{ lineHeight: 13 }}>{n > 9 ? t('+٩') : ar(n)}</T>
    </View>
  );
}

/** One tab: the pill behind the icon springs in when the tab becomes active. */
function Tab({ it, on, onPress }: { it: Item; on: boolean; onPress: () => void }) {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { springTo(a, on ? 1 : 0, 'snappy').start(); }, [on, a]);
  return (
    <Press onPress={onPress} role="tab" selected={on} label={it.label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 64 }}>
      <View style={{ width: 48, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 48, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }} />
        <Icon name={it.icon} size={22} color={on ? colors.brand : colors.faint} stroke={on ? 2.1 : 1.8} />
        <Badge n={it.badge} />
      </View>
      <T size={11} w={on ? 'semibold' : 'medium'} color={on ? colors.brand : colors.faint} style={{ lineHeight: 15 }}>{it.label}</T>
    </Press>
  );
}

/** The envelope in the home header: all conversations, with the unread count. */
export function InboxButton({ light }: { light?: boolean }) {
  const { unread } = useInbox();
  return (
    <Pressable onPress={() => router.push('/messages')} accessibilityRole="button" accessibilityLabel={unread ? t('{0} رسائل جديدة', unread) : t('الرسائل')} hitSlop={8}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: light ? 'rgba(255,255,255,.14)' : colors.surface, borderWidth: light ? 0 : 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="chatbubbles-outline" size={21} color={light ? '#fff' : colors.ink} />
      {unread ? (
        <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: light ? colors.brand : colors.surface }}>
          <T size={10} w="bold" color={colors.brand} style={{ lineHeight: 13 }}>{unread > 9 ? t('+٩') : ar(unread)}</T>
        </View>
      ) : null}
    </Pressable>
  );
}
