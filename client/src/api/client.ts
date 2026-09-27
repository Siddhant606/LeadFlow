import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL as string) || '';
const cleanBase = rawBase ? `${rawBase.replace(/\/+$/, '')}/api` : '/api';

export const api = axios.create({
  baseURL: cleanBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('leadflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('leadflow_token');
      localStorage.removeItem('leadflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
