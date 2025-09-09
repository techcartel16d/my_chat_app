import axios from 'axios';
import { getString } from "../utils/mmkvStorage"


const soketId = getString('socketId')
console.log("soketId in api", soketId)
// ✅ Axios instance
const api = axios.create({
    baseURL: 'https://chat.threeonline.in/chatify/api/', // apna API base url daalo
    timeout: 10000, // 10 sec timeout
    headers: {
        'Content-Type': 'application/json',
        'X-Socket-Id': soketId || '',
        Accept: 'application/json',

    },
});

// ✅ Request Interceptor (token add karne ke liye)
api.interceptors.request.use(
    async (config) => {

        const token = getString("token") || null; // abhi demo ke liye null rakha hai
        console.log("token", token)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response Interceptor (errors handle karne ke liye)
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
