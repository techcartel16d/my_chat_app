import axios from 'axios';
import { getString } from "../utils/mmkvStorage";

const soketId = getString('socketId');
console.log("soketId in api", soketId);

// ✅ Axios instance
const api = axios.create({
    baseURL: 'https://chat.threeonline.in/chatify/api/', // apna API base url daalo
    timeout: 10000,
    headers: {
        Accept: 'application/json',
        'X-Socket-Id': soketId || '',
    },
});

// ✅ Request Interceptor
api.interceptors.request.use(
    async (config) => {
        const token = getString("token") || null;
        console.log("token", token);

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 👇 Agar FormData bhej rahe ho to Content-Type auto set karne do
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];  
        } else {
            config.headers['Content-Type'] = 'application/json';
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.log('API Error:', error.response.data);
        } else {
            console.log('Network Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
