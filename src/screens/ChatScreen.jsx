import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { screenWidth } from '../utils/Constant';
import { useNavigation } from '@react-navigation/native';
import api from "../utils/api";
import { getString } from '../utils/mmkvStorage';
import uuid from 'react-native-uuid';
import { subscribeChannel, unsubscribeChannel } from '../utils/pusher';
import { authValue } from "../utils/AuthValueGet";

const ChatScreen = ({ route }) => {
    const { currentId } = route.params;   // receiverId
    const { goBack } = useNavigation();

    const currentUserId = authValue.userId; // logged-in user
    const [messages, setMessages] = useState([]);

    // Map API messages to GiftedChat format
    const mapApiMessagesToGiftedChat = (apiMessages) => {
        return apiMessages.map(msg => ({
            _id: msg.id,
            text: msg.body || msg.message || "",
            createdAt: new Date(msg.created_at),
            user: {
                _id: msg.from_id.toString(),
                name: msg.from_id === currentUserId ? 'You' : 'User ' + msg.from_id,
                avatar: 'https://i.pravatar.cc/150?img=' + msg.from_id,
            },
        }));
    };


    // Fetch previous messages
    const getMessageHandle = async () => {
        if (currentId) {
            try {
                const res = await api.post("fetchMessages", { id: currentId });
                const formattedMessages = mapApiMessagesToGiftedChat(res.data.messages);
                setMessages(formattedMessages.reverse());
            } catch (error) {
                console.log("❌ ERROR IN GET MESSAGE", error);
            }
        }
    };



    // Subscribe to Pusher events
    useEffect(() => {
        const channelName = `private-chatify.${currentUserId}`;

        subscribeChannel({
            channelName,
            eventName: "messaging",
            onEvent: (data) => {
                console.log("📥 Messaging event:", data);

                if (!data || !data.message) return;

                const msgObj = data.message;
                const senderId = parseInt(data.from_id);
                const receiverId = parseInt(data.to_id);

                // Sirf iss chat ke liye message append karo
                if (
                    (senderId === currentId && receiverId === currentUserId) ||
                    (senderId === currentUserId && receiverId === currentId)
                ) {
                    let newMsg = {
                        _id: msgObj.id,
                        createdAt: new Date(msgObj.created_at),
                        user: {
                            _id: senderId.toString(),
                            name: senderId === currentUserId ? "You" : "User " + senderId,
                            avatar: "https://i.pravatar.cc/150?img=" + senderId,
                        },
                    };

                    // 👉 Check text
                    if (msgObj.message && msgObj.message.trim() !== "") {
                        newMsg.text = msgObj.message;
                    }

                    // 👉 Check attachment
                    if (msgObj.attachment && msgObj.attachment.file) {
                        if (msgObj.attachment.type === "image") {
                            newMsg.image = `https://your-server.com/uploads/${msgObj.attachment.file}`;
                        } else {
                            // Agar file ho to custom handling (GiftedChat file support nahi deta by default)
                            newMsg.text = msgObj.attachment.title || "📎 File attached";
                        }
                    }

                    // ✅ Append to GiftedChat
                    setMessages((prev) => GiftedChat.append(prev, [newMsg]));
                } else {
                    console.log("📥 Background message (dusre chat ka):", data);
                }
            },
        });

        getMessageHandle();

        return () => {
            unsubscribeChannel(channelName);
        };
    }, [currentId, currentUserId]);



    // Send message
    const onSend = useCallback(async (newMessages = []) => {
        const msg = newMessages[0];
        const tempId = uuid.v4();

        // show immediately
        setMessages(prev =>
            GiftedChat.append(prev, [{
                ...msg,
                _id: tempId,
                pending: true,
                user: { ...msg.user, _id: currentUserId.toString() }
            }])
        );

        const payload = {
            file: null,
            id: currentId.toString(),
            type: "user",
            temporaryMsgId: tempId,
            message: msg.text || "",
        };

        try {
            const res = await api.post("/sendMessage", payload);
            console.log("📤 user send message", res.data);

            // Update with server ID
            setMessages(prev =>
                prev.map(m =>
                    m._id === tempId
                        ? { ...m, _id: res.data.id?.toString() || tempId, pending: false }
                        : m
                )
            );
        } catch (error) {
            console.error("❌ Send error:", error);
        }
    }, [currentId]);

    
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
                user={{ _id: currentUserId.toString(), name: 'You', avatar: 'https://i.pravatar.cc/300?img=1' }}
                placeholder="Type a message..."
                alwaysShowSend
                scrollToBottom
                renderBubble={(props) => (
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: '#1E90FF' },
                            left: { backgroundColor: '#f0f0f0' },
                        }}
                        textStyle={{
                            right: { color: '#fff' },
                            left: { color: '#000' }
                        }}
                    />
                )}
                renderInputToolbar={(props) => (
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
                renderSend={(props) => (
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
});
