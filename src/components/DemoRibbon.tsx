import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO, demoRole, setDemoRole } from '@/lib/demo';
import { lang, setLang, t } from '@/lib/i18n';
import { bp, brand, colors } from '@/lib/theme';
import { T } from './ui';

/** Preview builds only: a small pill that says this is sample data and switches between the customer and shop sides, and the language. */
export function DemoRibbon() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!DEMO || Platform.OS !== 'web') return null;
  const role = demoRole();
  const reload = () => { try { location.href = location.pathname.includes('/shop') || location.pathname.includes('/customer') ? location.origin + location.pathname.replace(/\/(customer|shop).*$/, role === 'shop' ? '/customer' : '/shop') : location.href; } catch { /* fine */ } };
  const swap = () => { setDemoRole(role === 'shop' ? 'customer' : 'shop'); reload(); };
  const toggleLang = () => { setLang(lang === 'ar' ? 'en' : 'ar').then(() => location.reload()); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom + (width >= bp.desktop ? 24 : 96), left: 0, right: 0, alignItems: 'flex-end', paddingHorizontal: 16, zIndex: 50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,27,45,.88)', borderRadius: 999, paddingVertical: 4, paddingStart: 12, paddingEnd: 4 }}>
        <T size={11} w="semibold" color="#fff" style={{ lineHeight: 15 }}>{t('نسخة تجريبية · بيانات عينة')}</T>
        <Pressable onPress={swap} accessibilityRole="button" style={{ backgroundColor: brand.sky, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <T size={11} w="bold" color={colors.brand} style={{ lineHeight: 15 }}>{role === 'shop' ? t('شوف كعميل') : t('شوف كمحل')}</T>
        </Pressable>
        <Pressable onPress={toggleLang} accessibilityRole="button" style={{ backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <T size={11} w="bold" color="#fff" style={{ lineHeight: 15 }}>{lang === 'ar' ? 'EN' : 'ع'}</T>
        </Pressable>
      </View>
    </View>
  );
}
