import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearAccessToken,
  getAccessToken,
  notifyUnauthorized,
  setAccessToken,
} from "@/lib/auth-session";

const isLocalhostApiUrl = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/api)?\/?$/i.test(value);

export const isApiBaseUrlConfigured = Boolean(
  import.meta.env.VITE_API_BASE_URL?.trim() &&
    !(import.meta.env.PROD && isLocalhostApiUrl(import.meta.env.VITE_API_BASE_URL.trim()))
);

const resolveApiBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl) {
    if (import.meta.env.PROD && isLocalhostApiUrl(apiBaseUrl)) {
      return "/api";
    }

    return apiBaseUrl;
  }

  return import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
};

const API_BASE_URL = resolveApiBaseUrl();

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const shouldSkipRefresh = (url?: string) =>
  Boolean(
    url &&
      ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some((path) => url.includes(path))
  );

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { data } = await refreshClient.post<{ accessToken: string }>("/auth/refresh");
      setAccessToken(data.accessToken);
      originalRequest.headers = axios.AxiosHeaders.from(originalRequest.headers);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      notifyUnauthorized();
      return Promise.reject(refreshError);
    }
  }
);

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    api.post("/auth/login", payload),
  register: (payload: { name: string; email: string; password: string }) =>
    api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
  updateMe: (payload: { name: string; email: string; currentPassword?: string; newPassword?: string }) =>
    api.patch("/auth/me", payload),
  refresh: () => refreshClient.post("/auth/refresh"),
  logout: () => refreshClient.post("/auth/logout"),
};
