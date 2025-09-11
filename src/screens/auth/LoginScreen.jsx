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
} from 'react-native';

import { setObject, setString } from '../../utils/mmkvStorage'


import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = () => {
    const { replace } = useNavigation()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // toggle state

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');

            return;
        }

        try {
            setLoading(true)
            const res = await axios.post('https://chat.threeonline.in/api/login', { email, password });
            if (res.status == 200) {
                setString('token', res.data.token)
                setObject("user", res.data.user)
                replace('NoAuthStack')
            }else{
                console.log("response====>", res)
            }

        } catch (error) {
            console.log("ERROR IN LOGIN ", error)

        } finally {
            setLoading(false)
        }

        // console.log('Email:', email);
        // console.log('Password:', password);
        // Alert.alert('Success', 'Login clicked');
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
                        placeholderTextColor={'#000'}
                    />

                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword} // toggle visibility
                            placeholderTextColor={'#000'}
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

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                        <Text style={styles.buttonText}>
                            {
                                loading ? "Please wait..." : "Login"
                            }
                        </Text>
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
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
        color: '#000'
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
        color: '#000'

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
