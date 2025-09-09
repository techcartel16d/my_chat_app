import { useEffect } from 'react';
import AllRoutes from "./src/routes/AllRoutes";
import { initPusher } from './src/utils/pusher';

const App = () => {

  useEffect(() => {
    const setup = async () => {
      await initPusher({
        apiKey: 'd2996000c020b1f0dca0',
        cluster: 'ap2',
        authEndpoint: 'https://chat.threeonline.in/chatify/api/chat/auth',
      });

      // await subscribeChannel({
      //   channelName: 'private-chatify.1',
      //   eventName: 'messaging',
      //   onEvent: (data) => {
      //     console.log('📨 New message:', data);
      //   },
      // });
    };

    setup();
  }, []);


  return <AllRoutes />;
};

export default App;
