import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { DEMO, NoSocket, demoFetch, seedDemoSession } from './demo';

// Publishable values: safe to ship in the app. Data is protected by row level security in the database.
// The preview build may point elsewhere through EXPO_PUBLIC_SUPABASE_URL / _KEY; production sets nothing and keeps these.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ztnbyvfupadzhddnbdje.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_Cq6sW08mbNDB8gUzn9jvlQ_YnjzBQ9d';

// Demo mode (preview builds only): every request is answered in the browser from sample data; nothing reaches a server.
if (DEMO && Platform.OS === 'web') seedDemoSession(`sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`);

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: !DEMO,
    persistSession: true,
    detectSessionInUrl: false,
  },
  ...(DEMO ? { global: { fetch: demoFetch as typeof fetch }, realtime: { transport: NoSocket as any } } : {}),
});

export const photoUrl = (path?: string | null) =>
  path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null;
