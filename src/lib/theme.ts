import { Platform } from 'react-native';
/**
 * ضغطة (Daghta) design tokens: "workshop precision".
 * Navy carries the brand (headers, hero bands); the working surfaces are light; sky is the one action colour;
 * lime marks the "press" moment (selected, done, success). The same system the posts and the reel use.
 * Every colour, type size, radius and motion value in the app comes from this file.
 */
export const brand = {
  navy: '#041D3F',
  navy2: '#0B2D5C',
  sky: '#0AABFE',
  skySoft: '#E6F6FF',
  lime: '#7CD035',
  limeSoft: '#EAF7DF',
};

export const colors = {
  ground: '#F3F6FA',     // the page
  surface: '#FFFFFF',    // content, cards, sheets, bars
  card: '#FFFFFF',
  soft: '#EEF2F7',       // tags, inner wells
  ink: '#0F1B2D',        // body text
  muted: '#4A5A70',      // secondary text (AA on white)
  faint: '#6B7A90',      // hints and inactive icons (AA on white)
  line: '#E3E8EF',       // dividers and hairlines
  brand: '#041D3F',      // the navy: headers, hero bands, strong surfaces
  brandInk: '#FFFFFF',
  navy2: '#0B2D5C',      // raised surfaces on navy
  primary: '#0AABFE',    // the one action colour: main buttons (navy text on it), selection
  primaryInk: '#041D3F',
  primarySoft: '#E6F6FF',
  primaryText: '#006BB3', // links and selected text on white (the sky is too light for text)
  accent: '#006BB3',     // kept for older screens: link/selected text colour
  sky: '#0AABFE',
  accentDeep: '#00588F',
  accentInk: '#FFFFFF',
  accentSoft: '#E6F6FF',
  lime: '#7CD035',       // the press moment: fills, dots, checks (never text on white)
  limeInk: '#3E7A12',    // "done" text on white
  good: '#3E7A12',       // ready, done, guarantee (text)
  goodSoft: '#EAF7DF',
  bad: '#E5484D',        // refuse, error, delete
  badSoft: '#FDECEC',
  warn: '#8A5A00',       // preparing, waiting
  warnSoft: '#FFF3DC',
  amber: '#F5A623',
  plate: '#7DB4EA',      // the light-blue band of an Egyptian private-car plate
  shadow: '#041D3F',
};

/**
 * Type: Alexandria for display (titles, prices, big numbers), IBM Plex Sans Arabic for everything else.
 * Both ship inside the app, so phones and the web look the same. Plex carries Arabic-Indic digits designed with its letters.
 */
const plex = { regular: 'IBMPlexSansArabic_400Regular', medium: 'IBMPlexSansArabic_500Medium', semibold: 'IBMPlexSansArabic_600SemiBold', bold: 'IBMPlexSansArabic_700Bold' };
const alexandria = { bold: 'Alexandria_700Bold', black: 'Alexandria_800ExtraBold' };
const stack = (f: string, fallback = 'sans-serif') => (Platform.OS === 'web' ? `${f}, "IBM Plex Sans Arabic", "Segoe UI", Roboto, ${fallback}` : f);
export const fonts = {
  regular: stack(plex.regular),
  medium: stack(plex.medium),
  semibold: stack(plex.semibold),
  bold: stack(plex.bold),
  display: stack(alexandria.black, 'sans-serif'),
  displayBold: stack(alexandria.bold, 'sans-serif'),
};
export const fontWeights = { regular: '400', medium: '500', semibold: '600', bold: '700', display: '800', displayBold: '700' } as const;

/** The type scale. Body is 16 (it was 13–14). */
export const type = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, display: 36, hero: 48 } as const;
/** 4-pt spacing grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;
export const gutter = { phone: 20, tablet: 32, desktop: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 16, xl: 20, sheet: 28, pill: 999 };

/** Cards sit on a hairline border with no shadow (surface level 3). */
export const lift = {
  borderWidth: 1, borderColor: colors.line,
} as const;
/** Floating things (sheets, toasts, the assistant bubble) get a real shadow. */
export const liftStrong = {
  shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8,
} as const;
/** The hover/selected lift of a card on desktop. */
export const liftHover = {
  shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4,
} as const;

/** Breakpoints: the tab bar below 900, the rail above. */
export const bp = { tablet: 600, desktop: 900 } as const;
