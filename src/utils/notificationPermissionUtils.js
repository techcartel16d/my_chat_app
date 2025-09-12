// import { getApp } from '@react-native-firebase/app';
// import { getMessaging, requestPermission, getToken, AuthorizationStatus } from '@react-native-firebase/messaging';
// import { PermissionsAndroid, Platform } from 'react-native';

// export const requestNotificationPermission = async () => {
//     const app = getApp(); // ✅ Use modular API
//     const messaging = getMessaging(app);

//     if (Platform.OS === 'android' && Platform.Version >= 33) {
//         const result = await PermissionsAndroid.request(
//             PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//         );
//         if (result !== PermissionsAndroid.RESULTS.GRANTED) {
//             console.log('Notification permission not granted');
//             return;
//         }
//     }

//     try {
//         const authStatus = await requestPermission(messaging);
//         const enabled =
//             authStatus === AuthorizationStatus.AUTHORIZED ||
//             authStatus === AuthorizationStatus.PROVISIONAL;

//         if (enabled) {
//             console.log('🔐 Notification permission granted');
//             await fetchFCMToken();
//         } else {
//             console.log('🔒 Notification permission denied');
//         }
//     } catch (err) {
//         console.error('❌ Error requesting FCM permission:', err);
//     }
// };

// export const fetchFCMToken = async () => {
//     try {
//         const app = getApp(); // ✅ Use modular API
//         const messaging = getMessaging(app);
//         const token = await getToken(messaging);
//         console.log('✅ FCM Token Genrated Successfully:', token);
//         return token
//         // Optionally send token to your backend
//     } catch (error) {
//         console.error('❌ Failed to get FCM Token:', error);
//     }
// };



import { getApp } from '@react-native-firebase/app';
import {
    getMessaging,
    requestPermission,
    getToken,
    AuthorizationStatus
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { setString } from './mmkvStorage';
import { navigate } from './NavigationService';

export const requestNotificationPermission = async () => {
    const app = getApp();
    const messaging = getMessaging(app);

    if (Platform.OS === 'android' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission not granted');
            return;
        }
    }

    try {
        const authStatus = await requestPermission(messaging);
        const enabled =
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('🔐 Notification permission granted');
            await fetchFCMToken();
        } else {
            console.log('🔒 Notification permission denied');
        }
    } catch (err) {
        console.error('❌ Error requesting FCM permission:', err);
    }
};

export const fetchFCMToken = async () => {
    try {
        const app = getApp();
        const messaging = getMessaging(app);
        const token = await getToken(messaging);
        setString('fcm_token', token);
        console.log('✅ FCM Token Generated Successfully:', token);
        return token;
    } catch (error) {
        console.error('❌ Failed to get FCM Token:', error);
    }
};

// ✅ Handle notification when app is background or killed
export const checkNotificationState = async () => {
    const app = getApp();
    const messaging = getMessaging(app);

    // जब app background में था और notification click हुआ
    messaging.onNotificationOpenedApp(remoteMessage => {
        console.log('📲 Notification opened (background):', remoteMessage);

        if (remoteMessage?.data?.screen) {
            navigate(remoteMessage.data.screen, remoteMessage.data);
        }
    });

    // जब app पूरी तरह kill था और notification से खोला गया
    const initialNotification = await messaging.getInitialNotification();
    if (initialNotification) {
        console.log('🚀 Notification caused app to open from quit state:', initialNotification);

        if (initialNotification?.data?.screen) {
            navigate(initialNotification.data.screen, initialNotification.data);
        }
    }
};
