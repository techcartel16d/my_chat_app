import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getString } from "../../utils/mmkvStorage";
import { loadBundle } from "../../utils/loadBundle";

const SERVER_URL = "https://chat.threeonline.in/version.json";

export default function SplashScreen() {
    const navigation = useNavigation();
    const token = getString("token");
    const [checking, setChecking] = useState(true);

    const checkAndUpdate = async () => {
        try {
            const res = await fetch(SERVER_URL);
            const data = await res.json();
            console.log('data', data)
            const storedVersion = (await AsyncStorage.getItem("appVersion")) || "1.0";
            console.log(
                "📦 Local version:",
                storedVersion,
                "| Server:",
                data.version
            );

            if (data.version !== storedVersion) {
                console.log("🔄 New version found. Updating...");
                await loadBundle(data.bundleUrl);
                await AsyncStorage.setItem("appVersion", data.version);
            } else {
                console.log("✅ App is up to date.");
            }
        } catch (e) {
            console.error("❌ Update check failed:", e);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        (async () => {
            await checkAndUpdate();
            setTimeout(() => {
                if (token) {
                    navigation.replace("NoAuthStack");
                } else {
                    navigation.replace("AuthStack");
                }
            }, 1500);
        })();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Chat App</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ddd",
    },
    title: { fontSize: 30, fontWeight: "700" },
});