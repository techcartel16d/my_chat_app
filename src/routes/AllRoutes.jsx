import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import ChatScreen from '../screens/ChatScreen';
import SplashScreen from '../screens/splash/SplashScreen';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from "../screens/HomeScreen"



// Navigators
const Stack = createNativeStackNavigator();
// Auth Stack
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
    </Stack.Navigator>
)

// Drawer Navigator
const NoAuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, }}>
            <Stack.Screen name='HomeScreen' component={HomeScreen} />
            <Stack.Screen name='ChatScreen' component={ChatScreen} />
        </Stack.Navigator>
    )
}

// Main Navigation
const MainNavigator = () => {
    return (

        <Stack.Navigator screenOptions={{ headerShown: false, }}>
            <Stack.Screen name="SplashScreen" component={SplashScreen} />
            <Stack.Screen name="NoAuthStack" component={NoAuthStack} />
            <Stack.Screen name="AuthStack" component={AuthStack} />
        </Stack.Navigator>
    )
}



const AllRoutes = () => {
    return (
        <NavigationContainer >
            <MainNavigator />
        </NavigationContainer>
    )
}

export default AllRoutes

const styles = StyleSheet.create({})