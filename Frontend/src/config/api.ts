import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExtraConfig = {
  API_BASE_URL?: string;
  API_PORT?: number | string;
};

type LegacyManifest = {
  debuggerHost?: string;
  hostUri?: string;
  extra?: ExtraConfig;
};

const legacyManifest = (Constants.manifest ?? null) as LegacyManifest | null;
const extra = (Constants.expoConfig?.extra ?? legacyManifest?.extra ?? {}) as ExtraConfig;

const normalizeConfiguredBaseUrl = (value?: string) => value?.trim().replace(/\/$/, '');

const extractHostFromUri = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const hostWithPort = value.replace(/^[a-z]+:\/\//i, '').split('/')[0]?.trim();
  const host = hostWithPort?.split(':')[0]?.trim();
  console.log(host)

  if (!host || ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)) {
    return null;
  }

  return host;
};

const defaultPort = Number(extra.API_PORT ?? 3000);

const resolveDefaultBaseUrl = () => {
  const hostCandidates = [
    extractHostFromUri((Constants.expoConfig as { hostUri?: string } | null)?.hostUri),
    extractHostFromUri(legacyManifest?.debuggerHost),
    extractHostFromUri(legacyManifest?.hostUri)
  ];

  const lanHost = hostCandidates.find(Boolean);

  if (lanHost) {
    return `http://${lanHost}:${defaultPort}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${defaultPort}`;
  }

  return `http://127.0.0.1:${defaultPort}`;
};

export const API_BASE_URL = normalizeConfiguredBaseUrl(extra.API_BASE_URL) ?? resolveDefaultBaseUrl();
