/*
 * Copyright (c) 2024 Hemang Parmar
 *
 * Single Axios instance with interceptors for token attachment and silent
 * refresh. All app code goes through this — never use raw axios.
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthResponse } from '@/types/api';

const ACCESS_KEY = 'devassist.access';
const REFRESH_KEY = 'devassist.refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/api/auth/refresh',
      { refreshToken: refresh },
    );
    if (!res.data.success) return null;
    const { accessToken, refreshToken } = res.data.data;
    setTokens(accessToken, refreshToken);
    return accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const next = await refreshInFlight;
      if (next) {
        original.headers.set('Authorization', `Bearer ${next}`);
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
  if (!res.data.success) throw new Error(res.data.error.message);
  setTokens(res.data.data.accessToken, res.data.data.refreshToken);
  return res.data.data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', { email, password });
  if (!res.data.success) throw new Error(res.data.error.message);
  setTokens(res.data.data.accessToken, res.data.data.refreshToken);
  return res.data.data;
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch {
      /* ignore network errors during logout */
    }
  }
  clearTokens();
}
