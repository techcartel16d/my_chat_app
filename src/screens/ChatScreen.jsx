import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
  Alert,
  Dimensions
} from 'react-native';
import { GiftedChat, Bubble, InputToolbar, Send, Composer } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Video as VideoCompressor } from "react-native-compressor";
import Video from 'react-native-video';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../utils/api';
import { getString } from '../utils/mmkvStorage';
import uuid from 'react-native-uuid';
import { subscribeChannel, unsubscribeChannel } from '../utils/pusher';
import { authValue } from '../utils/AuthValueGet';
import { pick, keepLocalCopy, types } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImageView from "react-native-image-viewing";
import RNFetchBlob from "react-native-blob-util";
import AudioRecorderComponent from '../components/AudioRecording';
import AudioMessage from '../components/AudioMessage';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ route }) => {
  const { currentId, userInfo } = route.params;
  const { goBack } = useNavigation();
  const [visible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const currentUserId = authValue.userId;
  const [messages, setMessages] = useState([]);
  const giftedChatRef = useRef(null);

  const mapApiMessagesToGiftedChat = (messages) => {
    return messages.map(msgObj => {
      const senderId = parseInt(msgObj.from_id);
      const msgId = `server_${msgObj.id}`;

      let newMsg = {
        _id: msgId,
        createdAt: new Date(msgObj.created_at),
        user: {
          _id: senderId.toString(),
          name: senderId === currentUserId ? "You" : userInfo?.name || "User " + senderId,
          avatar: userInfo?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        },
        status: msgObj.seen === 1 ? "seen" : "sent",
      };

      if (msgObj.body && msgObj.body.trim() !== "") {
        newMsg.text = msgObj.body;
      }

      if (msgObj.attachment) {
        try {
          const attachmentData = JSON.parse(msgObj.attachment);
          const fileUrl = attachmentData.new_name.startsWith("http")
            ? attachmentData.new_name
            : `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;
          const ext = attachmentData.old_name?.split(".").pop().toLowerCase();

          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
            newMsg.image = fileUrl;
            if (!newMsg.text) newMsg.text = "";
          } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
            newMsg.video = fileUrl;
            if (!newMsg.text) newMsg.text = "";
          } else if (["wav", "mp3", "m4a", "aac"].includes(ext)) {
            newMsg.audio = fileUrl;
            if (!newMsg.text) newMsg.text = "";
          } else {
            newMsg.text = `📎 ${attachmentData.old_name || "File attached"}`;
            newMsg.file = fileUrl;
          }
        } catch (err) {
          console.log("❌ Invalid attachment JSON:", msgObj.attachment);
        }
      }

      return newMsg;
    });
  };

  const getMessageHandle = async (pageNumber = 1, isRefresh = false) => {
    if (!currentId || loading) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.post("fetchMessages", { id: currentId, page: pageNumber });
      const fetchedMessages = res.data.messages;

      const formattedMessages = mapApiMessagesToGiftedChat(fetchedMessages);

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m._id));
        const uniqueMessages = formattedMessages.filter(m => !existingIds.has(m._id));
        const updatedMessages = pageNumber === 1 ? uniqueMessages : [...prev, ...uniqueMessages];
        return updatedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });

      if (pageNumber >= res.data.last_page || fetchedMessages.length === 0) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setPage(pageNumber);
    } catch (error) {
      console.log("❌ ERROR IN GET MESSAGE", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

 const markMessagesAsSeen = async () => {
  try {
    const res = await api.post("makeSeen", { id: currentId });
    console.log("make message seen api response", res);

    if (res.data.status === 1) {
      setMessages(prev =>
        prev.map(m =>
          m.user._id !== currentUserId.toString()
            ? { ...m, status: 1 } // ✅ 1 = seen
            : m
        )
      );
    }
  } catch (err) {
    console.log("❌ Seen update error", err);
  }
};


  const onRefresh = () => {
    setPage(1);
    setHasMore(true);
    getMessageHandle(1, true);
  };

  useFocusEffect(
    useCallback(() => {
      const channelName = `private-chatify.${currentUserId}`;

      subscribeChannel({
        channelName,
        eventName: 'messaging',
        onEvent: data => {
          if (!data || !data.message) return;

          const msgObj = data.message;
          const senderId = parseInt(data.from_id);
          const receiverId = parseInt(data.to_id);

          if (
            (senderId === currentId && receiverId === currentUserId) ||
            (senderId === currentUserId && receiverId === currentId)
          ) {
            const existingMessage = messages.find(m => m._id === `server_${msgObj.id}`);
            if (existingMessage) return;

            let newMsg = {
              _id: `server_${msgObj.id}`,
              createdAt: new Date(msgObj.created_at),
              user: {
                _id: senderId.toString(),
                name: senderId === currentUserId ? "You" : userInfo?.name || "User " + senderId,
                avatar: userInfo?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              },
              status: senderId === currentUserId ? "sent" : "seen",
            };

            if (msgObj.message && msgObj.message.trim() !== '') {
              newMsg.text = msgObj.message;
            }

            if (msgObj.attachment && msgObj.attachment.file) {
              const fileUrl = msgObj.attachment.file.startsWith('http')
                ? msgObj.attachment.file
                : `https://chat.threeonline.in/storage/attachments/${msgObj.attachment.file}`;
              const type = msgObj.attachment.type;
              const ext = msgObj.attachment.title?.split('.').pop().toLowerCase() || '';

              if (type === 'image') {
                newMsg.image = fileUrl;
                newMsg.text = '';
              } else if (type === 'file') {
                if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
                  newMsg.video = fileUrl;
                  newMsg.text = '';
                } else if (['wav', 'mp3', 'm4a', 'aac'].includes(ext)) {
                  newMsg.audio = fileUrl;
                  newMsg.text = '';
                } else {
                  newMsg.text = `📎 ${msgObj.attachment.title || 'File attached'}`;
                  newMsg.file = fileUrl;
                }
              }
            }

            setMessages(prev => {
              const updatedMessages = GiftedChat.append(prev, [newMsg]);
              return updatedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            });

            if (senderId === currentId) {
              markMessagesAsSeen();
            }
          }
        },
      });

      subscribeChannel({
        channelName,
        eventName: 'typing',
        onEvent: data => {
          if (data.from_id === currentId && data.to_id === currentUserId) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          }
        },
      });

      subscribeChannel({
        channelName,
        eventName: 'message-seen',
        onEvent: data => {
          const messageId = data.id;
          setMessages(prev => prev.map(m => {
            if (m._id === `server_${messageId}` && m.user._id === currentUserId.toString()) {
              return { ...m, status: "seen" };
            }
            return m;
          }));
        },
      });

      getMessageHandle(1);
      markMessagesAsSeen();

      return () => {
        unsubscribeChannel(`private-chatify.${currentUserId}`);
      };
    }, [currentId, currentUserId, userInfo])
  );

  // const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
  //   const tempId = uuid.v4();
  //   setIsSending(true);

  //   let previewMsg = {
  //     _id: tempId,
  //     createdAt: new Date(),
  //     user: {
  //       _id: currentUserId.toString(),
  //       name: "You",
  //       avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
  //     },
  //     pending: true,
  //     status: "pending",
  //   };

  //   if (text) previewMsg.text = text;
  //   if (type === "image") previewMsg.image = fileUri;
  //   if (type === "video") previewMsg.video = fileUri;
  //   if (type === "audio") previewMsg.audio = fileUri;
  //   if (type === "document") previewMsg.text = `📎 ${fileName || "File attached"}`;

  //   setMessages(prev => {
  //     const updatedMessages = GiftedChat.append(prev, [previewMsg]);
  //     return updatedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  //   });

  //   try {
  //     let uploadUri = fileUri;

  //     if (type === "video") {
  //       uploadUri = await VideoCompressor.compress(fileUri, { compressionMethod: "auto" });
  //     }

  //     let ext = 'bin';
  //     let mimeType = 'application/octet-stream';

  //     if (type === "image") {
  //       ext = 'jpg';
  //       mimeType = 'image/jpeg';
  //     } else if (type === "video") {
  //       ext = 'mp4';
  //       mimeType = 'video/mp4';
  //     } else if (type === "audio") {
  //       ext = Platform.OS === 'ios' ? 'm4a' : 'mp3';
  //       mimeType = Platform.OS === 'ios' ? 'audio/mp4' : 'audio/mpeg';
  //     }

  //     const finalName = fileName || `${Date.now()}.${ext}`;

  //     let formData = [
  //       { name: "id", data: currentId.toString() },
  //       { name: "type", data: "user" },
  //       { name: "temporaryMsgId", data: tempId },
  //     ];

  //     if (text) formData.push({ name: "message", data: text });

  //     if (type) {
  //       formData.push({
  //         name: "file",
  //         filename: finalName,
  //         type: mimeType,
  //         data: RNFetchBlob.wrap(Platform.OS === "ios" ? uploadUri.replace("file://", "") : uploadUri),
  //       });
  //     }

  //     const res = await RNFetchBlob.fetch(
  //       "POST",
  //       "https://chat.threeonline.in/chatify/api/sendMessage",
  //       {
  //         Authorization: `Bearer ${getString("token")}`,
  //         "Content-Type": "multipart/form-data",
  //         "X-Socket-Id": getString("socketId") || "",
  //       },
  //       formData
  //     );

  //     let serverRes;
  //     try {
  //       serverRes = res.json();
  //     } catch {
  //       serverRes = JSON.parse(res.data);
  //     }

  //     let newMsg = {
  //       _id: serverRes.id?.toString() || tempId,
  //       createdAt: new Date(serverRes.created_at || new Date()),
  //       user: {
  //         _id: currentUserId.toString(),
  //         name: "You",
  //         avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
  //       },
  //       pending: false,
  //       status: "sent",
  //     };

  //     if (text) newMsg.text = text;
  //     if (type === "image" && previewMsg.image) newMsg.image = previewMsg.image;
  //     if (type === "video" && previewMsg.video) newMsg.video = previewMsg.video;
  //     if (type === "audio" && previewMsg.audio) newMsg.audio = previewMsg.audio;
  //     if (type === "document" && previewMsg.text) newMsg.text = previewMsg.text;

  //     if (serverRes.attachment) {
  //       try {
  //         const attachmentData = JSON.parse(serverRes.attachment);
  //         const fileUrl = attachmentData.new_name.startsWith("http")
  //           ? attachmentData.new_name
  //           : `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;
  //         const ext = attachmentData.old_name?.split(".").pop().toLowerCase();

  //         if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
  //           newMsg.image = fileUrl;
  //           newMsg.text = "";
  //         } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
  //           newMsg.video = fileUrl;
  //           newMsg.text = "";
  //         } else if (["wav", "mp3", "m4a", "aac"].includes(ext)) {
  //           newMsg.audio = fileUrl;
  //           newMsg.text = "";
  //         } else {
  //           newMsg.text = `📎 ${attachmentData.old_name || "File attached"}`;
  //           newMsg.file = fileUrl;
  //         }
  //       } catch (err) {
  //         console.log("❌ Invalid attachment JSON:", serverRes.attachment);
  //       }
  //     }

  //     setMessages(prev => prev.map(m => (m._id === tempId ? newMsg : m)));
  //   } catch (err) {
  //     console.log("❌ Send error", err);
  //     setMessages(prev => prev.map(m => m._id === tempId ? { ...m, pending: false, error: true } : m));
  //   } finally {
  //     setIsSending(false);
  //   }
  // };

  const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
    const tempId = uuid.v4();
    setIsSending(true);

    let previewMsg = {
      _id: tempId,
      createdAt: new Date(),
      user: {
        _id: currentUserId.toString(),
        name: 'You',
        avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      },
      pending: true,
      status: 'pending',
    };

    if (text) previewMsg.text = text;
    if (type === 'image') previewMsg.image = fileUri;
    if (type === 'video') previewMsg.video = fileUri;
    if (type === 'audio') previewMsg.audio = fileUri;
    if (type === 'document') previewMsg.text = `📎 ${fileName || 'File attached'}`;

    setMessages((prev) => {
      const updatedMessages = GiftedChat.append(prev, [previewMsg]);
      return updatedMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    try {
      let uploadUri = fileUri;

      if (type === 'video') {
        console.log('Compressing video:', fileUri);
        uploadUri = await VideoCompressor.compress(fileUri, { compressionMethod: 'auto' });
      }

      let ext = 'bin';
      let mimeType = 'application/octet-stream';

      if (type === 'image') {
        ext = 'jpg';
        mimeType = 'image/jpeg';
      } else if (type === 'video') {
        ext = 'mp4';
        mimeType = 'video/mp4';
      } else if (type === 'audio') {
        ext = fileName?.endsWith('.wav') ? 'wav' : Platform.OS === 'ios' ? 'm4a' : 'mp3';
        mimeType = fileName?.endsWith('.wav') ? 'audio/wav' : Platform.OS === 'ios' ? 'audio/mp4' : 'audio/mpeg';
      }

      const finalName = fileName || `${Date.now()}.${ext}`;

      console.log('Sending file:', { type, fileUri, finalName, mimeType });

      let formData = [
        { name: 'id', data: currentId.toString() },
        { name: 'type', data: 'user' },
        { name: 'temporaryMsgId', data: tempId },
      ];

      if (text) formData.push({ name: 'message', data: text });

      if (type && uploadUri) {
        formData.push({
          name: 'file',
          filename: finalName,
          type: mimeType,
          data: RNFetchBlob.wrap(Platform.OS === 'ios' ? uploadUri.replace('file://', '') : uploadUri),
        });
      }

      const res = await RNFetchBlob.fetch(
        'POST',
        'https://chat.threeonline.in/chatify/api/sendMessage',
        {
          Authorization: `Bearer ${getString('token')}`,
          'Content-Type': 'multipart/form-data',
          'X-Socket-Id': getString('socketId') || '',
        },
        formData
      );

      let serverRes;
      try {
        serverRes = res.json();
      } catch {
        serverRes = JSON.parse(res.data);
      }

      console.log('Server response:', serverRes);

      let newMsg = {
        _id: serverRes.id?.toString() || tempId,
        createdAt: new Date(serverRes.created_at || new Date()),
        user: {
          _id: currentUserId.toString(),
          name: 'You',
          avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        },
        pending: false,
        status: 'sent',
      };

      if (text) newMsg.text = text;
      if (type === 'image' && previewMsg.image) newMsg.image = serverRes.attachment ? JSON.parse(serverRes.attachment).new_name : previewMsg.image;
      if (type === 'video' && previewMsg.video) newMsg.video = serverRes.attachment ? JSON.parse(serverRes.attachment).new_name : previewMsg.video;
      if (type === 'audio' && previewMsg.audio) newMsg.audio = serverRes.attachment ? JSON.parse(serverRes.attachment).new_name : previewMsg.audio;
      if (type === 'document' && previewMsg.text) newMsg.text = previewMsg.text;

      if (serverRes.attachment) {
        try {
          const attachmentData = JSON.parse(serverRes.attachment);
          const fileUrl = attachmentData.new_name.startsWith('http')
            ? attachmentData.new_name
            : `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;
          const ext = attachmentData.old_name?.split('.').pop().toLowerCase();

          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            newMsg.image = fileUrl;
            newMsg.text = '';
          } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
            newMsg.video = fileUrl;
            newMsg.text = '';
          } else if (['wav', 'mp3', 'm4a', 'aac'].includes(ext)) {
            newMsg.audio = fileUrl;
            newMsg.text = '';
          } else {
            newMsg.text = `📎 ${attachmentData.old_name || 'File attached'}`;
            newMsg.file = fileUrl;
          }
        } catch (err) {
          console.log('❌ Invalid attachment JSON:', serverRes.attachment, err);
        }
      }

      setMessages((prev) => prev.map((m) => (m._id === tempId ? newMsg : m)));
    } catch (err) {
      console.log('❌ Send error:', err, { fileUri, fileName, type });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, pending: false, error: true } : m)));
    } finally {
      setIsSending(false);
    }
  };

  // const renderCustomActions = (props) => {
  //   if (props.isTextInputFocused) {
  //     return null;
  //   }

  //   return (
  //     <Animated.View entering={FadeIn} style={styles.actionContainer}>
  //       <TouchableOpacity onPress={pickDocument} style={styles.actionButton} accessible={true} accessibilityLabel="Attach document">
  //         <Ionicons name="document-attach" size={24} color="#6C63FF" />
  //       </TouchableOpacity>
  //       <TouchableOpacity onPress={pickMedia} style={styles.actionButton} accessible={true} accessibilityLabel="Pick media">
  //         <Ionicons name="image" size={24} color="#6C63FF" />
  //       </TouchableOpacity>
  //       <AudioRecorderComponent
  //         onSend={(fileData) => sendMessageToApi(fileData)}
  //         currentUserId={currentUserId}
  //       />
  //     </Animated.View>
  //   );
  // };
  const onSend = useCallback(
    (newMessages = []) => {
      const msg = newMessages[0];
      sendMessageToApi({ text: msg.text });
    },
    [currentId],
  );

  const pickDocument = async () => {
    try {
      const [res] = await pick({ type: [types.allFiles] });
      const [local] = await keepLocalCopy({
        files: [{ uri: res.uri, fileName: res.name ?? 'file' }],
        destination: 'documentDirectory',
      });

      sendMessageToApi({
        fileUri: local.uri || res.uri,
        fileName: res.name,
        type: 'document',
      });
    } catch (err) {
      console.log('Picker canceled or error:', err);
    }
  };

  const pickMedia = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        includeBase64: false,
        quality: 0.8
      });

      if (result.assets && result.assets.length) {
        const file = result.assets[0];
        sendMessageToApi({
          fileUri: file.uri,
          fileName: file.fileName,
          type: file.type.startsWith('video') ? 'video' : 'image',
        });
      }
    } catch (err) {
      console.log('Media picker error:', err);
    }
  };

  const renderCustomActions = (props) => {
    if (props.isTextInputFocused) {
      return null;
    }

    return (
      <Animated.View entering={FadeIn} style={styles.actionContainer}>
        <TouchableOpacity onPress={pickDocument} style={styles.actionButton} accessible={true} accessibilityLabel="Attach document">
          <Ionicons name="document-attach" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickMedia} style={styles.actionButton} accessible={true} accessibilityLabel="Pick media">
          <Ionicons name="image" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <AudioRecorderComponent
          onSend={(fileData) => sendMessageToApi(fileData)}
          currentUserId={currentUserId}
        />
      </Animated.View>
    );
  };

  const imageMessages = messages
    .filter((m) => m.image)
    .map((m) => ({ uri: m.image }));

  const renderTicks = (status) => {
    if (status === "pending") {
      return <Ionicons name="time-outline" size={16} color="gray" style={{ marginLeft: 4 }} />;
    }
    if (status === "error") {
      return <Ionicons name="alert-circle" size={16} color="#FF0000" style={{ marginLeft: 4 }} />;
    }
    if (status === "sent") {
      return <Ionicons name="checkmark" size={16} color="gray" style={{ marginLeft: 4 }} />;
    }
    if (status === "seen") {
      return <Ionicons name="checkmark-done" size={16} color="#1E90FF" style={{ marginLeft: 4 }} />;
    }
    return null;
  };

  const renderMessageImage = (props) => {
    const { currentMessage } = props;
    const isCurrentUser = currentMessage.user._id === currentUserId.toString();
    const currentIndex = imageMessages.findIndex((img) => img.uri === currentMessage.image);

    return (
      <View style={[styles.mediaWrapper, isCurrentUser ? styles.rightMediaWrapper : styles.leftMediaWrapper]}>
        <TouchableOpacity
          onPress={() => {
            setSelectedIndex(currentIndex);
            setIsVisible(true);
          }}
        >
          <Image
            source={{ uri: currentMessage.image }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
          <Text style={styles.timeText}>
            {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isCurrentUser && renderTicks(currentMessage.status)}
        </View>
      </View>
    );
  };

  const MessageVideo = ({ currentMessage, isCurrentUser, renderTicks }) => {
    const [paused, setPaused] = useState(true);

    return (
      <View style={[styles.mediaWrapper, isCurrentUser ? styles.rightMediaWrapper : styles.leftMediaWrapper]}>
        <TouchableOpacity onPress={() => setPaused(!paused)}>
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: currentMessage.video }}
              style={styles.messageVideo}
              resizeMode="cover"
              controls={true}
              paused={paused}
              muted={false}
              repeat={false}
              rate={1.0}
              volume={1.0}
              onEnd={() => setPaused(true)}
              onError={(error) => console.log('Video play error', error)}
            />
            {paused && (
              <View style={styles.videoPlayButton}>
                <Ionicons name="play" size={30} color="#FFF" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
          <Text style={styles.timeText}>
            {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isCurrentUser && renderTicks(currentMessage.status)}
        </View>
      </View>
    );
  };

  const renderMessageAudio = (props) => {
    const { currentMessage } = props;
    const isCurrentUser = currentMessage.user._id === currentUserId.toString();

    if (!currentMessage.audio) return null;

    return (
      <View style={[styles.mediaWrapper, isCurrentUser ? styles.rightMediaWrapper : styles.leftMediaWrapper]}>
        <AudioMessage
          audioUri={currentMessage.audio}
          messageId={currentMessage._id}
          playingMsgId={playingMsgId}
          setPlayingMsgId={setPlayingMsgId}
          isCurrentUser={isCurrentUser}
        />
        <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
          <Text style={styles.timeText}>
            {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isCurrentUser && renderTicks(currentMessage.status)}
        </View>
      </View>
    );
  };

  const renderBubble = (props) => {
    const { currentMessage } = props;
    const isCurrentUser = currentMessage.user._id === currentUserId.toString();

    if (currentMessage.error) {
      return (
        <View style={[styles.messageContainer, isCurrentUser ? styles.rightMessage : styles.leftMessage]}>
          <View style={[styles.bubble, isCurrentUser ? styles.rightBubble : styles.leftBubble, styles.errorBubble]}>
            <Text style={[styles.messageText, isCurrentUser ? styles.rightText : styles.leftText, styles.errorText]}>
              ❌ Failed to send message
            </Text>
          </View>
          <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
            <Text style={styles.timeText}>
              {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isCurrentUser && renderTicks("error")}
          </View>
        </View>
      );
    }

    if (currentMessage.pending) {
      return (
        <View style={[styles.messageContainer, isCurrentUser ? styles.rightMessage : styles.leftMessage]}>
          <View style={[styles.bubble, isCurrentUser ? styles.rightBubble : styles.leftBubble, styles.pendingBubble]}>
            <ActivityIndicator size="small" color={isCurrentUser ? "#FFF" : "#6C63FF"} />
            <Text style={[styles.messageText, isCurrentUser ? styles.rightText : styles.leftText, styles.pendingText]}>
              Sending...
            </Text>
          </View>
          <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
            <Text style={styles.timeText}>
              {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isCurrentUser && renderTicks("pending")}
          </View>
        </View>
      );
    }

    if (currentMessage.image) {
      return renderMessageImage(props);
    }

    if (currentMessage.video) {
      return <MessageVideo currentMessage={currentMessage} isCurrentUser={isCurrentUser} renderTicks={renderTicks} />;
    }

    if (currentMessage.audio) {
      return renderMessageAudio(props);
    }

    if (currentMessage.file) {
      return (
        <View style={[styles.messageContainer, isCurrentUser ? styles.rightMessage : styles.leftMessage]}>
          <TouchableOpacity
            style={[styles.bubble, isCurrentUser ? styles.rightBubble : styles.leftBubble]}
            onPress={() => {
              // Handle file download/open
              Alert.alert("File", "Would you like to download this file?", [
                { text: "Cancel", style: "cancel" },
                { text: "Download", onPress: () => console.log("Download file:", currentMessage.file) }
              ]);
            }}
          >
            <View style={styles.fileContainer}>
              <Ionicons name="document" size={24} color={isCurrentUser ? "#FFF" : "#6C63FF"} />
              <Text style={[styles.fileText, isCurrentUser ? styles.rightText : styles.leftText]} numberOfLines={2}>
                {currentMessage.text}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
            <Text style={styles.timeText}>
              {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isCurrentUser && renderTicks(currentMessage.status)}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.rightMessage : styles.leftMessage]}>
        <View style={[styles.bubble, isCurrentUser ? styles.rightBubble : styles.leftBubble]}>
          <Text style={[styles.messageText, isCurrentUser ? styles.rightText : styles.leftText]}>
            {currentMessage.text}
          </Text>
        </View>
        <View style={[styles.tickContainer, isCurrentUser ? styles.rightTickContainer : styles.leftTickContainer]}>
          <Text style={styles.timeText}>
            {new Date(currentMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isCurrentUser && renderTicks(currentMessage.status)}
        </View>
      </View>
    );
  };

  const renderSend = (props) => {
    return (
      <Send {...props} containerStyle={styles.sendContainer} disabled={isSending}>
        <View style={[styles.sendButton, isSending && styles.sendButtonDisabled]}>
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </View>
      </Send>
    );
  };

  const renderInputToolbar = (props) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
        renderActions={renderCustomActions}
      />
    );
  };

  const renderComposer = (props) => {
    return (
      <Composer
        {...props}
        textInputStyle={styles.composerTextInput}
        placeholder="Type a message..."
      />
    );
  };

  const renderFooter = () => {
    if (isTyping) {
      return (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{userInfo?.name || "Someone"} is typing...</Text>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      );
    }
    return null;
  };

  const renderLoadEarlier = (props) => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadEarlierContainer}>
        <ActivityIndicator size="small" color="#6C63FF" />
        <Text style={styles.loadEarlierText}>Loading older messages...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} accessible={true} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#2D2D2D" />
        </TouchableOpacity>

        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
          style={styles.headerAvatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userInfo?.name || "Unknown"}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? "Typing..." : "Online"}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerButton} accessible={true} accessibilityLabel="Call">
          {/* <Ionicons name="call" size={24} color="#6C63FF" /> */}
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton} accessible={true} accessibilityLabel="Video call">
          {/* <Ionicons name="videocam" size={24} color="#6C63FF" /> */}
        </TouchableOpacity>
      </View>

      <GiftedChat
        ref={giftedChatRef}
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: currentUserId.toString(),
          name: 'You',
          avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        }}
        placeholder="Type a message..."
        alwaysShowSend
        scrollToBottom
        infiniteScroll
        renderActions={renderCustomActions}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderComposer={renderComposer}
        renderSend={renderSend}
        renderFooter={renderFooter}
        renderLoadEarlier={renderLoadEarlier}
        loadEarlier={hasMore}
        isLoadingEarlier={loading}
        onLoadEarlier={() => getMessageHandle(page + 1)}
        listViewProps={{
          // refreshControl: (
          //   <RefreshControl
          //     refreshing={refreshing}
          //     onRefresh={onRefresh}
          //     colors={["#6C63FF"]}
          //     tintColor="#6C63FF"
          //   />
          // ),
          style: styles.listView,
        }}
        minInputToolbarHeight={60}
        bottomOffset={Platform.OS === 'ios' ? 20 : 0}
        timeTextStyle={{
          left: { color: '#6B7280' },
          right: { color: '#6B7280' },
        }}
      />

      <ImageView
        images={imageMessages}
        imageIndex={selectedIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
        animationType="fade"
      />
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
    marginLeft: 12,
  },
  listView: {
    backgroundColor: '#F0F2F5',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  actionButton: {
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F5F5FF',
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  rightMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  leftMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rightBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  leftBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingBubble: {
    opacity: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBubble: {
    backgroundColor: '#FECACA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  rightText: {
    color: '#1F2937',
  },
  leftText: {
    color: '#1F2937',
  },
  pendingText: {
    color: '#6B7280',
  },
  errorText: {
    color: '#991B1B',
  },
  mediaWrapper: {
    margin: 4,
  },
  rightMediaWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  leftMediaWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
  },
  messageVideo: {
    width: 250,
    height: 200,
    borderRadius: 12,
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
    marginLeft: 8,
  },
  inputToolbar: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputPrimary: {
    alignItems: 'center',
  },
  composerTextInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  typingContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  typingContainer: {
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  typingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B7280',
    marginHorizontal: 2,
  },
  tickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginRight: 4,
  }
});