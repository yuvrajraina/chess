import axios from 'axios';

const windowOrigin = window.location.origin;
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

export const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || `${windowOrigin}/api`;
export const WS_BASE_URL =
    process.env.REACT_APP_WS_BASE_URL || `${wsProtocol}://${window.location.host}/ws`;

export function getToken() {
    return localStorage.getItem('access');
}

export function getCurrentUserId() {
    const token = getToken();
    if (!token) return null;

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const payload = JSON.parse(atob(padded));
        return payload.user_id ? Number(payload.user_id) : null;
    } catch {
        return null;
    }
}

export const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
}); 

api.interceptors.response.use(response => response, async error => {
    const originalRequest = error.config;
    const refresh = localStorage.getItem('refresh');

    if (
        error.response?.status === 401 &&
        refresh &&
        originalRequest &&
        !originalRequest._retry
    ) {
        originalRequest._retry = true;

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
                refresh,
            });
            localStorage.setItem('access', response.data.access);
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return api(originalRequest);
        } catch (refreshError) {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
        }
    }

    return Promise.reject(error);
});
