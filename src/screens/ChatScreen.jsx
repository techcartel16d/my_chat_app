import React, { useState, useCallback, useEffect } from 'react';
import { ActivityIndicator, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video as VideoCompressor } from "react-native-compressor";
import Video from 'react-native-video';
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




  // const mapApiMessagesToGiftedChat = (messages) => {
  //   return messages.map(msgObj => {
  //     const senderId = parseInt(msgObj.from_id);


  //     let newMsg = {
  //       _id: msgObj.id,
  //       createdAt: new Date(msgObj.created_at),
  //       user: {
  //         _id: senderId.toString(),
  //         name: senderId === currentUserId ? 'You' : 'User ' + senderId,
  //         avatar: 'https://i.pravatar.cc/150?img=' + senderId,
  //       },
  //     };


  //     // Assign text if present
  //     if (msgObj.body && msgObj.body.trim() !== '') {
  //       newMsg.text = msgObj.body;
  //     }


  //     // Attachment handling
  //     if (msgObj.attachment) {
  //       let attachmentData;
  //       try {
  //         attachmentData = JSON.parse(msgObj.attachment);
  //       } catch (err) {
  //         console.log('❌ Invalid attachment JSON:', msgObj.attachment);
  //       }


  //       if (attachmentData && attachmentData.new_name) {
  //         const fileUrl = `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;
  //         const ext = attachmentData.old_name?.split('.').pop().toLowerCase() || '';


  //         if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
  //           newMsg.image = fileUrl;
  //           if (!msgObj.body) delete newMsg.text; // remove empty text
  //         } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
  //           newMsg.video = fileUrl;
  //           if (!msgObj.body) delete newMsg.text;
  //         } else {
  //           newMsg.text = `📎 ${attachmentData.old_name || 'File attached'}`;
  //           newMsg.file = fileUrl;
  //         }
  //       }
  //     }


  //     return newMsg;
  //   });
  // };


  const mapApiMessagesToGiftedChat = (messages) => {
    return messages.map(msgObj => {
      const senderId = parseInt(msgObj.from_id);

      // Prefix server messages to avoid conflict with temp messages
      const msgId = `server_${msgObj.id}`;

      let newMsg = {
        _id: msgId,
        createdAt: new Date(msgObj.created_at),
        user: {
          _id: senderId.toString(),
          name: senderId === currentUserId ? "You" : "User " + senderId,
          avatar: "https://i.pravatar.cc/150?img=" + senderId,
        },
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
            newMsg.text = "";
          } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
            newMsg.video = fileUrl;
            newMsg.text = "";
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

      const res = await api.post("fetchMessages", { id: currentId });
      const fetchedMessages = res.data.messages;

      console.log("Fetched messages:", fetchedMessages);

      const formattedMessages = mapApiMessagesToGiftedChat(fetchedMessages);

      if (pageNumber === 1) {
        // On refresh, remove duplicates by checking _id
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const uniqueMessages = formattedMessages.filter(m => !existingIds.has(m._id));
          return GiftedChat.append(uniqueMessages, prev);
        });
      } else {
        // On load more, remove duplicates before prepending
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const uniqueMessages = formattedMessages.filter(m => !existingIds.has(m._id));
          return GiftedChat.prepend(prev, uniqueMessages);
        });
      }

      // If less than 30 messages, no more pages
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




        // onEvent: data => {
        //   console.log('📥 Messaging event:', data);


        //   if (!data || !data.message) return;


        //   const msgObj = data.message;
        //   const senderId = parseInt(data.from_id);
        //   const receiverId = parseInt(data.to_id);


        //   if (
        //     (senderId === currentId && receiverId === currentUserId) ||
        //     (senderId === currentUserId && receiverId === currentId)
        //   ) {
        //     let newMsg = {
        //       _id: msgObj.id,
        //       createdAt: new Date(msgObj.created_at),
        //       user: {
        //         _id: senderId.toString(),
        //         name: senderId === currentUserId ? 'You' : 'User ' + senderId,
        //         avatar: 'https://i.pravatar.cc/150?img=' + senderId,
        //       },
        //     };


        //     // ✅ Text message
        //     if (msgObj.message && msgObj.message.trim() !== '') {
        //       newMsg.text = msgObj.message;
        //     }


        //     // 📎 Attachment handling
        //     if (msgObj.attachment && msgObj.attachment.file) {
        //       const fileUrl = msgObj.attachment.file.startsWith('http')
        //         ? msgObj.attachment.file
        //         : `https://chat.threeonline.in/storage/attachments/${msgObj.attachment.file}`;


        //       const type = msgObj.attachment.type;
        //       const ext = msgObj.attachment.title?.split('.').pop().toLowerCase() || '';


        //       if (type === 'image') {
        //         newMsg.image = fileUrl; // GiftedChat image prop
        //         newMsg.text = ''; // optional
        //       } else if (type === 'file') {
        //         if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
        //           newMsg.video = fileUrl; // GiftedChat video prop
        //           newMsg.text = ''; // optional
        //         } else {
        //           // Other document types
        //           newMsg.text = `📎 ${msgObj.attachment.title || 'File attached'}`;
        //           newMsg.file = fileUrl; // optional, if you want to handle click separately
        //         }
        //       }
        //     }


        //     setMessages(prev => GiftedChat.append(prev, [newMsg]));
        //   } else {
        //     console.log('📥 Background message (dusre chat ka):', data);
        //   }
        // }






        // onEvent: data => {
        //   console.log('📥 Messaging event:', data);




        //   if (!data || !data.message) return;


        //   const msgObj = data.message;
        //   const senderId = parseInt(data.from_id);
        //   const receiverId = parseInt(data.to_id);


        //   if (
        //     (senderId === currentId && receiverId === currentUserId) ||
        //     (senderId === currentUserId && receiverId === currentId)
        //   ) {
        //     let newMsg = {
        //       _id: msgObj.id,
        //       createdAt: new Date(msgObj.created_at),
        //       user: {
        //         _id: senderId.toString(),
        //         name: senderId === currentUserId ? 'You' : 'User ' + senderId,
        //         avatar: 'https://i.pravatar.cc/150?img=' + senderId,
        //       },
        //     };


        //     if (msgObj.message && msgObj.message.trim() !== '') {
        //       newMsg.text = msgObj.message;
        //     }




        //     if (msgObj.attachment && msgObj.attachment.file) {
        //       if (msgObj.attachment.type === 'image') {
        //         newMsg = {
        //           ...newMsg,
        //           text: '',
        //           image: msgObj.attachment.file.startsWith('http')
        //             ? msgObj.attachment.file
        //             : `https://chat.threeonline.in/storage/attachments/${msgObj.attachment.file}`,
        //         };
        //       } else if (msgObj.attachment.type === "file") {
        //         newMsg = {
        //           ...newMsg,
        //           text: '',
        //           video: msgObj.attachment.file.startsWith('http')
        //             ? msgObj.attachment.file
        //             : `https://chat.threeonline.in/storage/attachments/${msgObj.attachment.file}`,
        //         };
        //       } else {
        //         newMsg.text = msgObj.attachment.title || '📎 File attached';
        //       }
        //     }


        //     setMessages(prev => GiftedChat.append(prev, [newMsg]));
        //   } else {
        //     console.log('📥 Background message (dusre chat ka):', data);
        //   }
        // },
      });


      getMessageHandle();


      // 👇 Cleanup jab screen blur hogi
      return () => {
        unsubscribeChannel(`private-chatify.${currentUserId}`);
      };
    }, [currentId, currentUserId])
  );




  // const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
  //   console.log("sendMessageToApi called with:", { text, fileUri, fileName, type });
  //   const tempId = uuid.v4();


  //   // 👀 Local preview message
  //   let previewMsg = {
  //     _id: tempId,
  //     createdAt: new Date(),
  //     user: { _id: currentUserId.toString(), name: "You" },
  //     pending: true,
  //   };


  //   if (text) previewMsg.text = text;
  //   if (type === "image") previewMsg.image = fileUri;
  //   if (type === "video") previewMsg.video = fileUri;
  //   if (type === "document") previewMsg.text = `📎 ${fileName || "File attached"}`;


  //   setMessages((prev) => GiftedChat.append(prev, [previewMsg]));


  //   try {
  //     let uploadUri = fileUri;
  //     // ✅ Video compression
  //     if (type === "video") {
  //       console.log("📹 Compressing video...");
  //       uploadUri = await VideoCompressor.compress(
  //         fileUri,
  //         { compressionMethod: "auto" },
  //         (progress) => console.log("Compression progress:", progress)
  //       );
  //       console.log("✅ Compressed Video Path:", uploadUri);
  //     }


  //     // Prepare multipart/form-data
  //     const finalName =
  //       fileName ||
  //       `${Date.now()}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "bin"
  //       }`;


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
  //         type:
  //           type === "image"
  //             ? "image/jpeg"
  //             : type === "video"
  //               ? "video/mp4"
  //               : "application/octet-stream",
  //         data: RNFetchBlob.wrap(
  //           Platform.OS === "ios" ? uploadUri.replace("file://", "") : uploadUri
  //         ),
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
  //       serverRes = res.data;
  //     }


  //     // 🟢 Map server response to GiftedChat message
  //     let newMsg = {
  //       _id: serverRes.id?.toString() || tempId,
  //       createdAt: new Date(serverRes.created_at || new Date()),
  //       user: { _id: currentUserId.toString(), name: "You" },
  //       pending: false,
  //     };


  //     // Text
  //     if (text) newMsg.text = text;


  //     // Attachment
  //     if (serverRes.attachment) {
  //       try {
  //         const attachmentData = JSON.parse(serverRes.attachment);
  //         const ext = attachmentData.old_name?.split(".").pop().toLowerCase();
  //         const fileUrl = `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;


  //         if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
  //           newMsg.image = fileUrl;
  //           if (!text) delete newMsg.text;
  //         } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
  //           newMsg.video = fileUrl;
  //           if (!text) delete newMsg.text;
  //         } else {
  //           newMsg.text = `📎 ${attachmentData.old_name || "File attached"}`;
  //           newMsg.file = fileUrl;
  //         }
  //       } catch (err) {
  //         console.log("❌ Invalid attachment JSON:", serverRes.attachment);
  //       }
  //     }


  //     // Update message in state
  //     setMessages((prev) =>
  //       prev.map((m) => (m._id === tempId ? newMsg : m))
  //     );
  //   } catch (err) {
  //     console.log("❌ Send error", err);
  //   }
  // };



  const sendMessageToApi = async ({ text, fileUri, fileName, type }) => {
    console.log("sendMessageToApi called with:", { text, fileUri, fileName, type });
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
    if (type === "document") previewMsg.text = `📎 ${fileName || "File attached"}`;

    // ⏩ Add preview to state
    setMessages((prev) => GiftedChat.append(prev, [previewMsg]));

    try {
      let uploadUri = fileUri;

      // ✅ Video compression
      if (type === "video") {
        console.log("📹 Compressing video...");
        uploadUri = await VideoCompressor.compress(
          fileUri,
          { compressionMethod: "auto" },
          (progress) => console.log("Compression progress:", progress)
        );
        console.log("✅ Compressed Video Path:", uploadUri);
      }

      // Prepare multipart/form-data
      const finalName =
        fileName ||
        `${Date.now()}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "bin"}`;

      let formData = [
        { name: "id", data: currentId.toString() },
        { name: "type", data: "user" },
        { name: "temporaryMsgId", data: tempId },
      ];

      if (text) formData.push({ name: "message", data: text });

      if (type) {
        formData.push({
          name: "file",
          filename: finalName,
          type:
            type === "image"
              ? "image/jpeg"
              : type === "video"
                ? "video/mp4"
                : "application/octet-stream",
          data: RNFetchBlob.wrap(
            Platform.OS === "ios" ? uploadUri.replace("file://", "") : uploadUri
          ),
        });
      }

      const res = await RNFetchBlob.fetch(
        "POST",
        "https://chat.threeonline.in/chatify/api/sendMessage",
        {
          Authorization: `Bearer ${getString("token")}`,
          "Content-Type": "multipart/form-data",
          "X-Socket-Id": getString("socketId") || "",
        },
        formData
      );

      let serverRes;
      try {
        serverRes = res.json();
      } catch {
        serverRes = res.data;
      }

      // 🟢 Map server response to GiftedChat message
      let newMsg = {
        _id: serverRes.id?.toString() || tempId,
        createdAt: new Date(serverRes.created_at || new Date()),
        user: { _id: currentUserId.toString(), name: "You" },
        pending: false,
      };

      // Text
      if (text) newMsg.text = text;

      // Attachment from server
      if (serverRes.attachment) {
        try {
          const attachmentData = JSON.parse(serverRes.attachment);
          const ext = attachmentData.old_name?.split(".").pop().toLowerCase();
          const fileUrl = `https://chat.threeonline.in/storage/attachments/${attachmentData.new_name}`;

          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
            newMsg.image = fileUrl;
            if (!text) delete newMsg.text;
          } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
            newMsg.video = fileUrl;
            if (!text) delete newMsg.text;
          } else {
            newMsg.text = `📎 ${attachmentData.old_name || "File attached"}`;
            newMsg.file = fileUrl;
          }
        } catch (err) {
          console.log("❌ Invalid attachment JSON:", serverRes.attachment);
        }
      }

      // 🟢 Fallback: अगर server से attachment नहीं आया तो local preview use करो
      if (!newMsg.image && previewMsg.image) {
        newMsg.image = previewMsg.image;
      }
      if (!newMsg.video && previewMsg.video) {
        newMsg.video = previewMsg.video;
      }

      // Update message in state
      setMessages((prev) => prev.map((m) => (m._id === tempId ? newMsg : m)));
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
    // console.log("props", props)
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


  // 👇 Custom Video Render
  const renderMessageVideo = (props) => {
    const { currentMessage } = props;


    if (!currentMessage.video) return null;


    console.log("🎥 Rendering video:", currentMessage.video);


    return (
      <View style={{ borderRadius: 8, overflow: "hidden", margin: 4 }}>
        <Video
          source={{ uri: currentMessage.video }}
          style={{ width: 250, height: 180 }}
          resizeMode="cover"
          controls
          paused={true}
        />
      </View>
    );
  };
  const renderBubble = (props, currentUserId) => {
    const { currentMessage } = props;


    const getFileType = (url) => {
      if (!url) return '';
      return url.split('.').pop().toLowerCase();
    };


    const fileType = getFileType(currentMessage?.file);


    return (
      <View>
        {fileType === 'mp4' ? (
          // 🎥 Video Message
          <View
            style={[
              styles.videoContainer,
              currentMessage.user._id === currentUserId.toString()
                ? styles.rightAlign
                : styles.leftAlign,
            ]}
          >
            <Video
              source={{ uri: currentMessage.file }}
              style={styles.video}
              resizeMode="contain"
              controls
            />
          </View>
        ) : fileType === 'mp3' || fileType === 'wav' || fileType === 'aac' || fileType === 'opus' ? (
          // 🎵 Audio Message
          <TouchableOpacity style={styles.fileBubble}>
            <Text style={{ color: '#fff' }}>🎵 {currentMessage.text.replace("📎", "").trim()}</Text>
          </TouchableOpacity>
        ) : currentMessage?.file ? (
          // 📎 Other File
          <TouchableOpacity style={styles.fileBubble}>
            <Text style={{ color: '#fff' }}>
              📎 {currentMessage.text.replace("📎", "").trim()}
            </Text>
          </TouchableOpacity>
        ) : (
          // Normal Text
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
        )}


        {/* Pending Loader */}
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
        renderBubble={props => renderBubble(props, currentUserId)}
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
        renderMessageVideo={renderMessageVideo}
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
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    margin: 4
  }
});
