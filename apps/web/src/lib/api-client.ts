import axios, { AxiosError } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from './auth';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshing ??= refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(original);
        }
      } catch {
        refreshing = null;
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
    { refreshToken: refresh },
  );
  const { accessToken } = res.data;
  setAccessToken(accessToken);
  return accessToken;
}
