import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    await AsyncStorage.setItem('toeic_access_token', accessToken);
  }

  if (refreshToken) {
    await AsyncStorage.setItem('toeic_refresh_token', refreshToken);
  }
}

export async function getAccessToken() {
  return AsyncStorage.getItem('toeic_access_token');
}

export async function getRefreshToken() {
  return AsyncStorage.getItem('toeic_refresh_token');
}

export async function saveUserId(userId: number) {
  await AsyncStorage.setItem('toeic_user_id', String(userId));
}

export async function getSavedUserId(): Promise<number | null> {
  const value = await AsyncStorage.getItem('toeic_user_id');
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function saveDisplayName(name: string) {
  await AsyncStorage.setItem('toeic_display_name', name);
}

export async function getSavedDisplayName(): Promise<string | null> {
  return AsyncStorage.getItem('toeic_display_name');
}

export async function saveAvatarUrl(url: string) {
  await AsyncStorage.setItem('toeic_avatar_url', url);
}

export async function getSavedAvatarUrl(): Promise<string | null> {
  return AsyncStorage.getItem('toeic_avatar_url');
}

export async function clearAuthData() {
  await AsyncStorage.multiRemove([
    'toeic_access_token',
    'toeic_refresh_token',
    'toeic_user_id',
    'toeic_display_name',
    'toeic_avatar_url',
  ]);
}
