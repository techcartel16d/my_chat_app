import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { screenHeight, screenWidth } from "../utils/Constant";
import { useNavigation } from "@react-navigation/native";
import { clearAll, getObject } from "../utils/mmkvStorage";
import api from "../utils/api";

const HomeScreen = () => {
    const { navigate } = useNavigation();
    const [contactList, setContactList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState(null);

    const getContactHandler = async () => {
        setLoading(true);
        try {
            const res = await api.get("getContacts");
            if (res.status === 200) {
                console.log("📥 get contact api ", res.data);
                setContactList(res.data.contacts);
            }
        } catch (error) {
            console.log("❌ ERROR IN GET CONTACT API", error);
        } finally {
            setLoading(false);
        }
    };

    const getUser = () => {
        const user = getObject("user");
        setUserInfo(user);
    };

    useEffect(() => {
        getContactHandler();
        getUser();
    }, []);

    // Loader
    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#1E90FF" />
                <Text style={styles.loaderText}>Loading contacts...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle={"dark-content"} backgroundColor={"white"} />
            <SafeAreaView style={styles.container}>
                {/* ===== Header with user info ===== */}
                <View style={styles.chatHeader}>
                    <Image
                        source={{
                            uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                        }}
                        style={styles.userAvatar}
                    />
                    <View>
                        <Text style={styles.headerText}>👤 {userInfo?.name || "Guest"}</Text>
                        <Text style={styles.subHeaderText}>🆔 ID: {userInfo?.id}</Text>
                    </View>
                </View>

                {/* ===== Logout Button ===== */}
                <TouchableOpacity
                    onPress={() => {
                        clearAll();
                        navigate("AuthStack");
                    }}
                    style={styles.logoutBtn}
                >
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                {/* ===== Contact List ===== */}
                <FlatList
                    data={contactList}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => navigate("ChatScreen", { currentId: item.id })}
                            style={styles.contactCard}
                        >
                            <Image
                                source={{
                                    uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                                }}
                                style={styles.contactAvatar}
                            />
                            <View>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <Text style={styles.contactEmail}>{item.email}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                        <Text style={styles.emptyText}>No contacts found 📭</Text>
                    )}
                    contentContainerStyle={{ paddingVertical: screenHeight * 1 }}
                />
            </SafeAreaView>
        </>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },

    // Loader
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loaderText: {
        // marginTop: 10,
        color: "#555",
    },

    // Header
    chatHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f2f2f2",
        padding: screenWidth * 3,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        gap: screenWidth * 3,
    },
    userAvatar: {
        width: screenWidth * 12,
        height: screenWidth * 12,
        borderRadius: screenWidth * 6,
        borderWidth: 1,
        // marginRight: screenWidth * 3,
    },
    headerText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
    },
    subHeaderText: {
        fontSize: 13,
        fontWeight: "400",
        color: "#555",
    },

    // Logout Button
    logoutBtn: {
        alignSelf: "center",
        marginVertical: screenHeight * 2,
        backgroundColor: "#1E90FF",
        paddingVertical: screenHeight * 1.5,
        paddingHorizontal: screenWidth * 8,
        borderRadius: screenWidth * 3,
        elevation: 3,
    },
    logoutText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },

    // Contact Card
    contactCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9f9f9",
        marginHorizontal: screenWidth * 3,
        marginBottom: screenHeight,
        padding: screenWidth * 3,
        borderRadius: screenWidth * 2,
        elevation: 2,
    },
    contactAvatar: {
        width: screenWidth * 10,
        height: screenWidth * 10,
        borderRadius: screenWidth * 5,
        marginRight: screenWidth * 3,
    },
    contactName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
    },
    contactEmail: {
        fontSize: 13,
        fontWeight: "400",
        color: "#555",
    },

    // Empty
    emptyText: {
        textAlign: "center",
        marginTop: 20,
        color: "#777",
    },
});
