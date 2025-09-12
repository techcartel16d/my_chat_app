// // src/utils/FirebaseUtils.js
// import { Alert } from 'react-native';
// import { getApp } from '@react-native-firebase/app';
// import { getToken, deleteToken, onMessage, onNotificationOpenedApp, getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
// import { setString } from './mmkvStorage';

// /**
//  * Get FCM token
//  */
// export const getFcmToken = async () => {
//     try {
//         const token = await getMessaging().getToken();
//         if (token) {
//             console.log('FCM Token:', token);
//             setString('fcm_token', token);
//             return token;
//         } else {
//             console.log('No FCM token received');
//             return null;
//         }
//     } catch (error) {
//         console.log('Error getting FCM token:', error);
//         return null;
//     }
// };

// /**
//  * Delete FCM token (on logout)
//  */
// export const deleteFcmToken = async () => {
//     try {
//         await deleteToken(getApp());
//         console.log('FCM Token deleted');
//     } catch (error) {
//         console.log('Error deleting FCM token:', error);
//     }
// };

// /**
//  * Foreground notifications listener
//  */
// export const foregroundNotificationListener = (onNotification) => {
//     return onMessage(getApp(), async remoteMessage => {
//         console.log('Foreground notification:', remoteMessage);
//         if (onNotification) onNotification(remoteMessage);
//         else Alert.alert('New Notification', remoteMessage.notification?.title || '');
//     });
// };

// /**
//  * Background notifications listener
//  */
// export const backgroundNotificationListener = (onNotification) => {
//     onNotificationOpenedApp(getApp(), remoteMessage => {
//         console.log('Background notification clicked:', remoteMessage);
//         if (onNotification) onNotification(remoteMessage);
//     });
// };

// /**
//  * Handle notification when app is quit
//  */

