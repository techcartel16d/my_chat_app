import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { screenHeight, screenWidth } from '../utils/Constant'
import { useNavigation } from '@react-navigation/native'
import { clearAll, getObject, getString } from '../utils/mmkvStorage'
import api from '../utils/api'

const HomeScreen = () => {
    const { navigate } = useNavigation()
    const [contactList, setContactList] = useState([])
    const [loading, setLoading] = useState(false);
    const [userInfo, setUserInfo] = useState(null)

    const getContactHandler = async () => {
        setLoading(true)
        try {
            const res = await api.get('getContacts');
            if (res.status == 200) {
                console.log("get contact api ", res.data)
                setContactList(res.data.contacts)

            }
        } catch (error) {
            console.log("ERROR IN GET CONTACT API", error)
        } finally {
            setLoading(false)
        }
    }

    const getUser = () => {
        const user = getObject('user')
        setUserInfo(user)
    }

    useEffect(() => {
        getContactHandler()
        getUser()

    }, [])

    if (loading) {
        // ✅ loader dikhao jab tak data aata hai
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#1E90FF" />
                <Text style={{ marginTop: 10, color: "#555" }}>Loading contacts...</Text>
            </View>
        );
    }


    return (
        <>
            <StatusBar barStyle={'dark-content'} backgroundColor={'white'} />
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: '#fff',
            }}>
                <View style={styles.chatHeader}>
                    <Text style={styles.headerText}> id: {userInfo && userInfo.id} </Text>
                    <Text style={styles.headerText}> name {userInfo && userInfo.name} </Text>
                </View>
                <TouchableOpacity onPress={() => {
                    clearAll()
                    navigate("AuthStack")
                }} style={{
                    width: "40%",
                    height: screenHeight * 4,
                    alignSelf: 'center',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'blue',
                    borderRadius: screenWidth * 3,
                    marginVertical: screenHeight
                }}>
                    <Text style={{
                        fontSize: 18,
                        color: "#fff"
                    }}>Clear all</Text>
                </TouchableOpacity>


                {/* <TouchableOpacity onPress={() => navigate("ChatScreen")} style={{
                width: "40%",
                height: screenHeight * 4,
                alignSelf: 'center',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'blue',
                borderRadius: screenWidth * 3
            }}>
                <Text style={{
                    fontSize: 18,
                    color: "#fff"
                }}>Chat Now</Text>
            </TouchableOpacity> */}

                <FlatList
                    data={contactList}

                    key={(item) => item.id}
                    renderItem={({ item, index }) => {
                        return (
                            <View style={{
                                padding: screenWidth * 3
                            }}>
                                <TouchableOpacity onPress={() => navigate("ChatScreen", { currentId: item.id })} style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: screenWidth * 2,
                                    backgroundColor: '#eee',
                                    padding: screenWidth * 2,
                                    borderRadius: screenWidth * 2,
                                    elevation: 4
                                }}>
                                    <Image source={{ uri: "https://img.freepik.com/free-vector/smiling-redhaired-boy-illustration_1308-176664.jpg" }} style={{
                                        width: screenWidth * 10,
                                        height: screenWidth * 10,
                                        borderWidth: 1,
                                        borderRadius: screenWidth * 10,
                                        overflow: 'hidden',
                                        resizeMode: 'contain'
                                    }} />
                                    <View style={{

                                    }}>

                                        <Text style={{ color: '#000', fontSize: 18, fontWeight: '600' }}>{item.name}</Text>
                                        <Text style={{ color: '#000', fontSize: 12, fontWeight: '300' }}>{item.email}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )
                    }}

                    ListEmptyComponent={() => (
                        <Text style={{ textAlign: "center", marginTop: 20, color: "#777" }}>
                            No contacts found
                        </Text>
                    )}


                    contentContainerStyle={{
                        // padding: screenWidth * 3,
                        // paddingTop: screenHeight * 2,

                    }}

                />





            </SafeAreaView>
        </>

    )
}

export default HomeScreen

const styles = StyleSheet.create({
    chatHeader: {
        width: "100%",
        backgroundColor: "#f2f2f2",
        height: screenHeight * 5,
        justifyContent: 'center',
        paddingHorizontal: screenWidth * 2
    },
    headerText: {
        fontSize: 15,
        fontWeight: "500"
    }

})