import { useEffect } from 'react';
import { Platform } from 'react-native';
import AllRoutes from './src/routes/AllRoutes';
import { initPusher } from './src/utils/pusher';
import {
  getFcmToken,
  handleQuitStateNotification,
} from './src/utils/FirebaseUtils';
import { navigate } from './src/utils/NavigationService';
import { checkNotificationState, requestNotificationPermission } from './src/utils/notificationPermissionUtils'

const App = () => {

  useEffect(() => {
    (async () => {
      requestNotificationPermission();
    })();
  }, []);



  useEffect(() => {
    const setup = async () => {
      console.log('📱 Platform:', Platform.OS);

      // 1️⃣ Initialize Pusher
      await initPusher({
        apiKey: 'd2996000c020b1f0dca0',
        cluster: 'ap2',
        authEndpoint: 'https://chat.threeonline.in/chatify/api/chat/auth',
      });

      // 4️⃣ Handle notification click when app is quit/terminated
      checkNotificationState();
    };

    setup();
  }, []);

  return <AllRoutes />;
};

export default App;
