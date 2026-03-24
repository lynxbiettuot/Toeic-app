import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    await AsyncStorage.setItem('toeic_access_token', accessToken);
  }

  if (refreshToken) {
    await AsyncStorage.setItem('toeic_refresh_token', refreshToken);
  }
}
