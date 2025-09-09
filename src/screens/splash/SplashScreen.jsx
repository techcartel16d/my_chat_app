import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { getString } from '../../utils/mmkvStorage'


const SplashScreen = ({ }) => {
    const navigation = useNavigation()
    const token = getString('token')
    useEffect(() => {
        setTimeout(() => {
            if (token) {

                navigation.replace("NoAuthStack")
            } else {

                navigation.replace("AuthStack")
            }
        }, 1500)
    }, [])
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
                fontSize: 30,
                fontWeight: '700'

            }}>Chat App</Text>
        </SafeAreaView>
    )
}

export default SplashScreen

const styles = StyleSheet.create({})