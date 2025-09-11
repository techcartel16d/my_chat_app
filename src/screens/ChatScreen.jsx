
import React, { useState, useCallback, useEffect } from 'react';
import { ActivityIndicator, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { screenWidth } from '../utils/Constant';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../utils/api';
import { getString } from '../utils/mmkvStorage';
import uuid from 'react-native-uuid';
import { subscribeChannel, unsubscribeChannel } from '../utils/pusher';
import { authValue } from '../utils/AuthValueGet';
import { pick, keepLocalCopy, types } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageView from "react-native-image-viewing";
import RNFetchBlob from "react-native-blob-util";
const ChatScreen = ({ route }) => {
  const { currentId } = route.params; // receiverId
  const { goBack } = useNavigation();
  const [visible, setIsVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);


  const currentUserId = authValue.userId; // logged-in user
  const [messages, setMessages] = useState([]);

  // Map API messages to GiftedChat format
  const mapApiMessagesToGiftedChat = apiMessages => {
    return apiMessages.map(msg => {
      let newMsg = {
        _id: msg.id,
        text: msg.body || msg.message || '',
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.from_id.toString(),
          name: msg.from_id === currentUserId ? 'You' : 'User ' + msg.from_id,
          avatar: 'https://i.pravatar.cc/150?img=' + msg.from_id,
        },
      };

      // 👉 Attachment parse


      if (msg.attachment) {
        try {
          const file = JSON.parse(msg.attachment);

          // check extension
          const ext = file.new_name.split('.').pop().toLowerCase();

          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            // agar image hai to GiftedChat image field me set karo
            newMsg.image = `https://chat.threeonline.in/storage/attachments/${file.new_name}`;
          } else {
            // agar document/file hai
            newMsg.text = `📎 ${file.old_name}`;
            newMsg.file = `https://chat.threeonline.in/storage/attachments/${file.new_name}`;
          }
        } catch (e) {
          console.log('Attachment parse error:', e);
        }
      }

      return newMsg;
    });
  };




  // Fetch previous messages
  // const getMessageHandle = async () => {
  //   if (currentId) {
  //     try {
  //       const res = await api.post('fetchMessages', { id: currentId });
  //       console.log("get message", res.data.messages);
  //       const formattedMessages = mapApiMessagesToGiftedChat(res.data.messages);
  //       setMessages(formattedMessages);
  //     } catch (error) {
  //       console.log('❌ ERROR IN fetch MESSAGE', error);
  //     }
  //   }
  // };


  // API Call
  const getMessageHandle = async (pageNumber = 1, isRefresh = false) => {
    if (!currentId || loading) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.post("fetchMessages", {
        id: currentId,
        page: pageNumber,
        limit: 30,
      });

      const fetchedMessages = res.data.messages;
      const formattedMessages = mapApiMessagesToGiftedChat(fetchedMessages);

      if (pageNumber === 1) {
        setMessages(formattedMessages);
      } else {
        setMessages(prev =>
          GiftedChat.prepend(prev, formattedMessages)
        );
      }

      if (fetchedMessages.length < 30) {
        setHasMore(false);
      }

      setPage(pageNumber);
    } catch (error) {
      console.log("❌ ERROR IN GET MESSAGE", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to Refresh handler
  const onRefresh = () => {
    if (hasMore) {
      getMessageHandle(page + 1, true); // 👈 next page load
    }
  };





  // Subscribe to Pusher events
  useFocusEffect(
    useCallback(() => {
      const channelName = `private-chatify.${currentUserId}`;

      subscribeChannel({
        channelName,
        eventName: 'messaging',
        onEvent: data => {
          console.log('📥 Messaging event:', data);

          if (!data || !data.message) return;

          const msgObj = data.message;
          const senderId = parseInt(data.from_id);
          const receiverId = parseInt(data.to_id);

          if (
            (senderId === currentId && receiverId === currentUserId) ||
            (senderId === currentUserId && receiverId === currentId)
          ) {
            let newMsg = {
              _id: msgObj.id,
              createdAt: new Date(msgObj.created_at),
              user: {
                _id: senderId.toString(),
                name: senderId === currentUserId ? 'You' : 'User ' + senderId,
                avatar: 'https://i.pravatar.cc/150?img=' + senderId,
              },
            };

            if (msgObj.message && msgObj.message.trim() !== '') {
              newMsg.text = msgObj.message;
            }

            if (msgObj.attachment && msgObj.attachment.file) {
              if (msgObj.attachment.type === 'image') {
                newMsg = {
                  ...newMsg,
                  text: '', // 👈 empty text dena zaruri hai
                  image: `https://chat.threeonline.in/storage/attachments/${msgObj.attachment.file}`,
                };
              } else {
                newMsg.text = msgObj.attachment.title || '📎 File attached';
              }
            }

            setMessages(prev => GiftedChat.append(prev, [newMsg]));
          } else {
            console.log('📥 Background message (dusre chat ka):', data);
          }
        },
      });

      getMessageHandle();

      // 👇 Cleanup jab screen blur hogi
      return () => {
        unsubscribeChannel(`private-chatify.${currentUserId}`);
      };
    }, [currentId, currentUserId])
  );

  // // 📤 Common send function (text + file dono ke liye)
  // const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
  //   const tempId = uuid.v4();

  //   // 👀 Local preview
  //   let previewMsg = {
  //     _id: tempId,
  //     createdAt: new Date(),
  //     user: { _id: currentUserId.toString(), name: 'You' },
  //     pending: true,
  //   };

  //   if (text) previewMsg.text = text;
  //   if (type === 'image') previewMsg.image = fileUri;
  //   if (type === 'video') previewMsg.video = fileUri;
  //   if (type === 'document')
  //     previewMsg.text = `📎 ${fileName || 'File attached'}`;

  //   setMessages(prev => GiftedChat.append(prev, [previewMsg]));

  //   try {
  //     let res;
  //     if (fileUri) {
  //       const formData = new FormData();

  //       formData.append('id', currentId.toString());
  //       formData.append('type', 'user');
  //       formData.append('temporaryMsgId', tempId);

  //       if (text) {
  //         formData.append('message', text);
  //       }

  //       let fileType = 'application/octet-stream';
  //       if (type === 'image') fileType = 'image/*';
  //       if (type === 'video') fileType = 'video/*';

  //       const finalName = fileName || `${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;

  //       formData.append('file', {
  //         uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
  //         type: fileType,
  //         name: finalName,
  //       });

  //       // 🚀 Header yahan mat do, interceptor handle karega
  //       res = await api.post('/sendMessage', formData);
  //     }

  //     else {
  //       // ✉️ Agar sirf text hai
  //       res = await api.post('/sendMessage', {
  //         file: null,
  //         id: currentId.toString(),
  //         type: 'user',
  //         temporaryMsgId: tempId,
  //         message: text || '',
  //       });
  //     }

  //     console.log('✅ Sent to API:', res.data);

  //     // Update local message with server ID
  //     setMessages(prev =>
  //       prev.map(m =>
  //         m._id === tempId
  //           ? { ...m, _id: res.data.id?.toString() || tempId, pending: false }
  //           : m,
  //       ),
  //     );
  //   } catch (err) {
  //     console.log('❌ Send error', err);
  //   }
  // };


  const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
    const tempId = uuid.v4();

    // 👀 Local preview message
    let previewMsg = {
      _id: tempId,
      createdAt: new Date(),
      user: { _id: currentUserId.toString(), name: "You" },
      pending: true,
    };

    if (text) previewMsg.text = text;
    if (type === "image") previewMsg.image = fileUri;
    if (type === "video") previewMsg.video = fileUri;
    if (type === "document")
      previewMsg.text = `📎 ${fileName || "File attached"}`;

    setMessages((prev) => GiftedChat.append(prev, [previewMsg]));

    try {
      let res;

      // ✅ Agar file hai
      if (fileUri) {
        let fileType = "application/octet-stream";
        if (type === "image") fileType = "image/jpeg";
        if (type === "video") fileType = "video/mp4";

        const finalName =
          fileName || `${Date.now()}.${type === "image" ? "jpg" : "mp4"}`;

        res = await RNFetchBlob.fetch(
          "POST",
          "https://chat.threeonline.in/chatify/api/sendMessage",
          {
            Authorization: `Bearer ${getString("token")}`, // 👈 tumhara token storage se
            "Content-Type": "multipart/form-data",
            "X-Socket-Id": getString("socketId") || "",
          },
          [
            { name: "id", data: currentId.toString() },
            { name: "type", data: "user" },
            { name: "temporaryMsgId", data: tempId },
            text ? { name: "message", data: text } : null,
            {
              name: "file",
              filename: finalName,
              type: fileType,
              data: RNFetchBlob.wrap(
                Platform.OS === "ios"
                  ? fileUri.replace("file://", "")
                  : fileUri
              ),
            },
          ].filter(Boolean) // null hata do
        );

        console.log("✅ Upload Response", res.json());
      } else {
        // ✉️ Agar sirf text hai
        res = await api.post("/sendMessage", {
          file: null,
          id: currentId.toString(),
          type: "user",
          temporaryMsgId: tempId,
          message: text || "",
        });
        console.log("✅ Text Sent:", res.data);
      }

      const serverRes = res.json ? res.json() : res.data;

      // 🟢 Update local message with server ID
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId
            ? { ...m, _id: serverRes.id?.toString() || tempId, pending: false }
            : m
        )
      );
    } catch (err) {
      console.log("❌ Send error", err);
    }
  };







  // ✉️ Text message send (GiftedChat default)
  const onSend = useCallback(
    (newMessages = []) => {
      const msg = newMessages[0];
      sendMessageToApi({ text: msg.text });
    },
    [currentId],
  );

  // 📄 Document picker
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

  // 🖼️ Media picker (image / video)
  const pickMedia = async () => {
    const result = await launchImageLibrary({ mediaType: 'mixed' });
    if (result.assets && result.assets.length) {
      const file = result.assets[0];
      sendMessageToApi({
        fileUri: file.uri,
        fileName: file.fileName,
        type: file.type.startsWith('video') ? 'video' : 'image',
      });
    }
  };

  const renderCustomActions = () => (
    <View style={styles.actionContainer}>
      <TouchableOpacity onPress={pickDocument} style={styles.actionBtn}>
        <Icon name="attach-file" size={24} color="#4a90e2" />
      </TouchableOpacity>
      <TouchableOpacity onPress={pickMedia} style={styles.actionBtn}>
        <Icon name="photo" size={24} color="#4a90e2" />
      </TouchableOpacity>
    </View>
  );

  const imageMessages = messages
    .filter((m) => m.image)
    .map((m) => ({ uri: m.image }));


  // ✅ Custom Image renderer
  const renderMessageImage = (props) => {
    console.log("props", props)
    const currentIndex = imageMessages.findIndex(
      (img) => img.uri === props.currentMessage.image
    );

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedIndex(currentIndex);
          setIsVisible(true);
        }}
      >
        <Image
          source={{ uri: props.currentMessage.image }}
          style={{ width: 200, height: 200, borderRadius: 10 }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={{ width: '100%', padding: screenWidth * 3 }}>
        <TouchableOpacity onPress={() => goBack()}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Chat UI */}
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: currentUserId.toString(),
          name: 'You',
          avatar: 'https://i.pravatar.cc/300?img=1',
        }}
        placeholder="Type a message..."
        alwaysShowSend
        scrollToBottom
        renderActions={renderCustomActions}
        // renderBubble={props => (
        //   <Bubble
        //     {...props}
        //     wrapperStyle={{
        //       right: { backgroundColor: '#1E90FF' },
        //       left: { backgroundColor: '#f0f0f0' },
        //     }}
        //     textStyle={{
        //       right: { color: '#fff' },
        //       left: { color: '#000' },
        //     }}
        //   />
        // )}

        renderBubble={props => {
          const { currentMessage } = props;
          return (
            <View>
              <Bubble
                {...props}
                wrapperStyle={{
                  right: { backgroundColor: '#1E90FF' },
                  left: { backgroundColor: '#f0f0f0' },
                }}
                textStyle={{
                  right: { color: '#fff' },
                  left: { color: '#000' },
                }}
              />

              {/* 👇 Agar message pending hai to loader dikhayenge */}
              {currentMessage?.pending && (
                <ActivityIndicator
                  size="small"
                  color="#1E90FF"
                  style={{
                    marginTop: 4,
                    alignSelf:
                      currentMessage.user._id === currentUserId.toString()
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                />
              )}
            </View>
          );
        }}





        renderInputToolbar={props => (
          <InputToolbar
            {...props}
            containerStyle={{
              borderTopWidth: 0,
              margin: 8,
              borderRadius: screenWidth * 3,
              backgroundColor: '#fff',
              elevation: 3,
            }}
            primaryStyle={{ alignItems: 'center' }}
          />
        )}
        renderMessageImage={renderMessageImage}
        renderSend={props => (
          <TouchableOpacity
            style={{
              backgroundColor: '#1E90FF',
              paddingHorizontal: screenWidth * 5,
              paddingVertical: 10,
              borderRadius: screenWidth * 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              if (props.text && props.onSend) {
                props.onSend({ text: props.text.trim() }, true);
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        )}
        // inverted={true}
        loadEarlier={hasMore}       // 👈 dikhayega "Load Earlier"
        isLoadingEarlier={loading}  // 👈 spinner dikhayega
        onLoadEarlier={() => getMessageHandle(page + 1)} // 👈 upar scroll pe aur messages fetch
        listViewProps={{
          refreshControl: (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ),
        }}
      />

      <ImageView
        images={imageMessages}
        imageIndex={selectedIndex}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eee',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
});