import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/config';
import { ApiErrorShape } from '@/lib/types';

const ACCESS_TOKEN_KEY = 'teachalike_access_token';
const REFRESH_TOKEN_KEY = 'teachalike_refresh_token';
const CHILD_SESSION_KEY = 'teachalike_child_session';
export const getChildSessionToken = () => typeof window === 'undefined' ? null : window.sessionStorage.getItem(CHILD_SESSION_KEY);
export const setChildSessionToken = (token: string) => { if (typeof window !== 'undefined') window.sessionStorage.setItem(CHILD_SESSION_KEY, token); };
export const clearChildSessionToken = () => { if (typeof window !== 'undefined') window.sessionStorage.removeItem(CHILD_SESSION_KEY); };

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Keep the long-lived credential scoped to this browser session. The API
  // should move it to an HttpOnly cookie when frontend/backend share a site.
  return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

interface TokenPair {
  access_token?: string;
  refresh_token?: string;
}

export function setTokens({ access_token, refresh_token }: TokenPair): void {
  if (typeof window === 'undefined') return;
  if (access_token) window.localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  if (refresh_token) {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  clearChildSessionToken();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach bearer token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const url = String(config.url || '');
  if (url.includes('/api/parent/active-child') || url.includes('/api/reading-sessions') || (url.includes('/api/mini-games/') && url.includes('/results')) || (url.includes('/api/books/') && url.includes('/likes/'))) {
    const childToken = getChildSessionToken(); if (childToken) config.headers['X-Child-Session'] = childToken;
  }
  return config;
});

interface BackendErrorData {
  errors?: string[];
  error?: string;
  message?: string;
  error_code?: string;
  rejection_reason?: string;
  feature?: string;
  current?: number;
  limit?: number | null;
  currentPlan?: string;
  recommendedPlan?: string;
}

function normalizeBackendErrorData(
  data: BackendErrorData | undefined,
  status?: number,
): ApiErrorShape | null {
  const upgrade = data ? { feature: data.feature, current: data.current, limit: data.limit,
    currentPlan: data.currentPlan, recommendedPlan: data.recommendedPlan } : {};
  if (data?.errors && Array.isArray(data.errors)) {
    return { message: data.errors.join(' '), fields: data.errors, status, errorCode: data.error_code, rejectionReason: data.rejection_reason, ...upgrade };
  }
  if (data?.error) {
    const fields = [data.error];
    if (data.rejection_reason) fields.push(`Reason: ${data.rejection_reason}`);
    return { message: data.message || fields.join(' '), fields, status, errorCode: data.error_code, rejectionReason: data.rejection_reason, ...upgrade };
  }
  if (data?.message) {
    return { message: data.message, fields: [data.message], status, errorCode: data.error_code, rejectionReason: data.rejection_reason };
  }
  return null;
}

// Normalize backend error shapes into a single { message, fields } error object.
export function normalizeError(error: AxiosError<BackendErrorData> | unknown): ApiErrorShape {
  const err = error as AxiosError<BackendErrorData>;
  const backendError = normalizeBackendErrorData(err?.response?.data, err?.response?.status);
  if (backendError) return backendError;
  if (err?.code === 'ECONNABORTED') {
    return { message: 'The request took too long. Please check your connection and try again.', fields: [], status: err?.response?.status };
  }
  if (error instanceof Error && error.message) {
    return { message: error.message, fields: [error.message], status: err?.response?.status };
  }
  return { message: 'Something went wrong. Please try again.', fields: [], status: err?.response?.status };
}

// Axios returns error responses as Blob objects when responseType is "blob".
// Decode a JSON error body so audio playback failures retain the API's useful
// message instead of becoming a generic browser "Network Error".
async function normalizeResponseError(error: unknown): Promise<ApiErrorShape> {
  const err = error as AxiosError<BackendErrorData | Blob>;
  const data = err?.response?.data;

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as BackendErrorData;
      const backendError = normalizeBackendErrorData(parsed, err.response?.status);
      if (backendError) return backendError;
    } catch {
      // Non-JSON error blobs fall through to the standard Axios error.
    }
  }

  return normalizeError(error);
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function flushQueue(err: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

// On 401, try a single silent refresh, then retry the original request once.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorData | Blob>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const responseData = error.response?.data;
    const approvalCode = (
      responseData && typeof responseData === 'object' && 'error_code' in responseData
        ? String(responseData.error_code || '')
        : undefined
    );
    if (
      status === 403 &&
      approvalCode?.startsWith('TEACHER_APPROVAL_') &&
      !originalRequest?.url?.includes('/api/auth/login')
    ) {
      clearTokens();
      redirectToLogin();
    }
    const isAccountCredentialCheck =
      originalRequest?.url === '/api/parents/me' &&
      ['patch', 'delete'].includes(
        String(originalRequest.method || '').toLowerCase(),
      );
    // Some authenticated endpoints intentionally use 401 for a failed
    // business check. An incorrect child PIN must stay in the PIN modal; it
    // must not sign the parent out or start a token refresh.
    const isNonRefreshable401Route =
      originalRequest?.url?.includes('/api/auth/login') ||
      originalRequest?.url?.includes('/api/auth/register') ||
      originalRequest?.url?.includes('/api/auth/refresh') ||
      originalRequest?.url?.includes('/api/auth/logout') ||
      isAccountCredentialCheck ||
      (originalRequest?.url?.includes('/api/children/') && originalRequest?.url?.includes('/verify-pin'));

    if (status === 401 && originalRequest && !originalRequest._retry && !isNonRefreshable401Route) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(await normalizeResponseError(error));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );
        const newAccessToken = res.data.access_token;
        setTokens({ access_token: newAccessToken });
        flushQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        clearTokens();
        redirectToLogin();
        return Promise.reject(await normalizeResponseError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(await normalizeResponseError(error));
  }
);

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export default api;
