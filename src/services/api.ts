import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { auth } from '../../firebaseConfig'; // adjust path if your folder structure differs

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  return host
    ? `http://${host}:5000`
    : "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

// Gets a valid token from Firebase directly.
// getIdToken() returns the cached token if it's still valid,
// or silently refreshes it if it has expired — no manual expiry math needed.
async function getFreshToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (e) {
    console.warn('Failed to get Firebase ID token:', e);
    return null;
  }
}

// 🔥 GLOBAL SECURE FETCH
export async function apiFetch(url: string, options: RequestInit = {}) {
  let token = await getFreshToken();

  const buildHeaders = (t: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(options.headers as Record<string, string>),
  });

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: buildHeaders(token),
    credentials: 'include',
  });

  // If the server rejects the token as expired/invalid, force a refresh and retry once.
  if (response.status === 401) {
    const refreshedToken = await getFreshToken(true);
    if (refreshedToken && refreshedToken !== token) {
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: buildHeaders(refreshedToken),
        credentials: 'include',
      });
    }
  }

  return response;
}

export { API_BASE_URL };

