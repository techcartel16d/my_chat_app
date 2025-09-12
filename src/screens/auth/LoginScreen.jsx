import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    ActivityIndicator,
} from 'react-native';

import { getString, setObject, setString } from '../../utils/mmkvStorage';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = () => {
    const { replace } = useNavigation();

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const fcmToken = getString('fcm_token');
    console.log("📲 In login screen FCM Token:", fcmToken);

    // ✅ Input validation
    const validateInputs = () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter both email and password');
            return false;
        }
        return true;
    };

    // ✅ Handle Login API
    const handleLogin = async () => {
        if (!validateInputs()) return;

        const loginData = {
            email: email.trim(),
            password: password.trim(),
            fcm_token: fcmToken
        };

        try {
            setLoading(true);

            const res = await axios.post(
                'https://chat.threeonline.in/api/login',
                loginData,
                { timeout: 10000 } // 10s timeout
            );

            if (res?.status === 200 && res?.data?.token) {
                console.log("✅ Login Success:", res.data);

                // Save token + user in local storage
                setString('token', res.data.token);
                setObject("user", res.data.user);

                replace('NoAuthStack');
            } else {
                console.log("⚠️ Unexpected response:", res);
                Alert.alert('Login Failed', res?.data?.message || 'Something went wrong');
            }
        } catch (error) {
            console.log("❌ ERROR IN LOGIN:", error?.response || error?.message);

            if (error?.response?.status === 401) {
                Alert.alert('Invalid Credentials', 'Email or password is incorrect');
            } else if (error?.response?.status === 500) {
                Alert.alert('Server Error', 'Please try again later');
            } else {
                Alert.alert('Error', error?.message || 'Network error, try again');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <KeyboardAvoidingView
                    style={styles.inner}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Text style={styles.title}>Login</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholderTextColor={'#999'}
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor={'#999'}
                        />
                        <TouchableOpacity
                            style={styles.showHideButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.showHideText}>
                                {showPassword ? 'Hide' : 'Show'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && { opacity: 0.7 }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eee',
    },
    inner: {
        padding: 20,
        justifyContent: 'center',
        flexGrow: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        alignSelf: 'center',
        color: '#333'
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    passwordContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    inputPassword: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    showHideButton: {
        position: 'absolute',
        right: 15,
        top: 12,
    },
    showHideText: {
        color: '#1E90FF',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#1E90FF',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
