import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    withCredentials: true
});

// Automatically attach Bearer token from localStorage to every outgoing request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("jupiter_session_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
