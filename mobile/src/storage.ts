// Saved on the phone between app launches: login token, guest device id, server address.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { token: 'ludo.token', deviceId: 'ludo.deviceId', serverUrl: 'ludo.serverUrl' };

export const storage = {
  getToken: () => AsyncStorage.getItem(KEYS.token),
  setToken: (token: string) => AsyncStorage.setItem(KEYS.token, token),
  clearToken: () => AsyncStorage.removeItem(KEYS.token),

  getServerUrl: () => AsyncStorage.getItem(KEYS.serverUrl),
  setServerUrl: (url: string) => AsyncStorage.setItem(KEYS.serverUrl, url),

  // A random id made once per install, so "Play as guest" always returns the same guest player.
  async getDeviceId(): Promise<string> {
    let id = await AsyncStorage.getItem(KEYS.deviceId);
    if (!id) {
      id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEYS.deviceId, id);
    }
    return id;
  },
};
