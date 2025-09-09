import Pusher from 'pusher-js/react-native';
import { setString, getString } from './mmkvStorage';

let pusher = null;
let channels = {};

/**
 * Initialize Pusher
 */
export const initPusher = ({ apiKey, cluster, authEndpoint }) => {
  return new Promise((resolve, reject) => {
    try {
      pusher = new Pusher(apiKey, {
        cluster,
        forceTLS: true,
        authEndpoint,
        auth: {
          headers: {
            Authorization: `Bearer ${getString('token')}`,
          },
        },
      });

      // Connection success
      pusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
        const socketId = pusher.connection.socket_id;
        console.log('✅ SOCKET ID:', socketId);
        setString('socketId', socketId);
        resolve(pusher);
      });

      // Connection error
      pusher.connection.bind('error', (err) => {
        console.error('❌ Pusher connection error:', err);
        reject(err);
      });

      // Global listener (for debugging ALL events)
      pusher.bind_global((eventName, data) => {
        console.log(`🌍 Global event => ${eventName}:`, data);
      });
    } catch (err) {
      console.error('❌ Pusher init error:', err);
      reject(err);
    }
  });
};

/**
 * Subscribe to channel
 */
export const subscribeChannel = ({ channelName, eventName, onEvent }) => {
  if (!pusher) {
    console.error('❌ Pusher not initialized!');
    return;
  }

  console.log(`📡 Subscribing to channel: ${channelName}`);
  const channel = pusher.subscribe(channelName);
  channels[channelName] = channel;

  channel.bind('pusher:subscription_succeeded', () => {
    console.log(`✅ Subscribed to ${channelName}`);
  });

  // Bind custom event
  if (eventName && onEvent) {
    channel.bind(eventName, (data) => {
      console.log(`📩 Event on ${channelName} (${eventName}):`, data);
      onEvent(data);
    });
  }
};

/**
 * Unsubscribe
 */
export const unsubscribeChannel = (channelName) => {
  if (channels[channelName]) {
    pusher.unsubscribe(channelName);
    console.log(`🚪 Unsubscribed from: ${channelName}`);
    delete channels[channelName];
  }
};

export default pusher;
