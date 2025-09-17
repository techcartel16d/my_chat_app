import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  RefreshControl,
  TextInput,
  ToastAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { screenHeight, screenWidth } from "../utils/Constant";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { clearAll, getObject } from "../utils/mmkvStorage";
import api from "../utils/api";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import pusher, { initPusher } from "../utils/pusher";

const HomeScreen = () => {
  const { navigate } = useNavigation();
  const [contactList, setContactList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  console.log("userInfo", userInfo);

  const getContactHandler = async () => {
    setLoading(true);
    try {
      const res = await api.get("getContacts");
      console.log("all contacts", res);
      if (res.status === 200 && Array.isArray(res.data.contacts)) {
        setContactList(res.data.contacts);
      } else {
        setContactList([]);
      }
    } catch (error) {
      console.log("❌ ERROR IN GET CONTACT API", error);
      setContactList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim() === "") {
      ToastAndroid.show("Please enter contact name", ToastAndroid.SHORT);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(`search?input=${searchQuery}`);
      console.log("search api response", res);
      if (res.status === 200 && Array.isArray(res.data.records)) {
        setContactList(res.data.records);
      } else {
        setContactList([]);
      }
    } catch (error) {
      console.log("❌ ERROR IN SEARCH API", error);
      setContactList([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    getContactHandler();
  };

  const onRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    getContactHandler();
  };

  const getUser = () => {
    const user = getObject("user");
    setUserInfo(user);
  };
 

 useFocusEffect(
     useCallback(() => {
  const setupPusher = async () => {
      const user = getObject("user");

      // ✅ init pusher
      const client = await initPusher({
        apiKey: "d2996000c020b1f0dca0",
        cluster: "ap2",
        authEndpoint: "https://chat.threeonline.in/chatify/api/chat/auth",
      });

      // ✅ अब subscribe कर सकते हैं
      const channel = client.subscribe(`private-contacts.${user.id}`);

      channel.bind("contactsUpdated", (data) => {
        console.log("📢 Contact update aaya", data);
        setContactList((prev) =>
          prev.map((c) =>
            c.id === data.peer_id
              ? {
                ...c,
                unread_count: data.unread_count,
                last_message: data.last_message ?? c.last_message,
                last_message_time:
                  data.last_message_time ?? c.last_message_time,
              }
              : c
          )
        );
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    };
    getUser()
    getContactHandler()
    setupPusher();
     }, [])
  );

  useEffect(() => {
    if (menuVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [menuVisible]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loaderText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        {/* ===== Header ===== */}
        <View style={styles.chatHeader}>
          <View style={styles.headerLeft}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
              }}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.headerText}>
                Hello, {userInfo?.name || "Guest"} 👋
              </Text>
              <Text style={styles.subHeaderText}>{userInfo?.email || "N/A"}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setMenuVisible(!menuVisible)}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#6C63FF" />
          </TouchableOpacity>

          <Animated.View
            style={[styles.dropdownMenu, { opacity: fadeAnim }]}
            pointerEvents={menuVisible ? "auto" : "none"}
          >
            <TouchableOpacity
              onPress={() => {
                clearAll();
                navigate("AuthStack");
              }}
              style={styles.menuItem}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.menuText, { color: "#FF6B6B" }]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ===== Contact List Header ===== */}
        <View style={styles.contactHeader}>
          <Text style={styles.contactTitle}>Contacts</Text>
          <Text style={styles.contactCount}>
            {contactList?.length || 0} contacts
          </Text>
        </View>

        {/* ===== Search Bar ===== */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchButton}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Ionicons name="search" size={20} color="#6C63FF" />
            )}
          </TouchableOpacity>
        </View>

        {/* ===== Contact List ===== */}
        <FlatList
          data={contactList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigate("ChatScreen", { currentId: item.id, userInfo: item })
              }
              style={styles.contactCard}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                }}
                style={styles.contactAvatar}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactEmail} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
              <View style={styles.rightContainer}>
                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unread_count > 99 ? "99+" : item.unread_count}
                    </Text>
                  </View>
                )}
                <MaterialIcons
                  name="keyboard-arrow-right"
                  size={24}
                  color="#C5C5C5"
                />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#E5E5E5" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching contacts found" : "No contacts found"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Try a different search term"
                  : "Your contacts will appear here"}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6C63FF"]}
              tintColor="#6C63FF"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  loaderText: {
    marginTop: 16,
    color: "#6C63FF",
    fontSize: 16,
    fontWeight: "500",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  userInfo: {
    marginLeft: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D2D2D",
  },
  subHeaderText: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5FF",
  },
  dropdownMenu: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 20,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contactTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D2D2D",
  },
  contactCount: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2D2D2D",
    paddingVertical: 12,
  },
  clearButton: {
    padding: 8,
  },
  searchButton: {
    padding: 8,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2D2D",
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: "#888",
  },
  rightContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  unreadBadge: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#AAA",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
});