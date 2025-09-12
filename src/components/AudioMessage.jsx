// import React, { useState, useEffect } from 'react';
// import { View, TouchableOpacity, Text } from 'react-native';
// import Sound from 'react-native-sound';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// const AudioMessage = ({ audioUri, messageId, playingMsgId, setPlayingMsgId }) => {
//     const [soundInstance, setSoundInstance] = useState(null);
//     const [duration, setDuration] = useState(0);
//     const [currentTime, setCurrentTime] = useState(0);
//     const [processing, setProcessing] = useState(false);
//     const [isPlaying, setIsPlaying] = useState(false);

//     useEffect(() => {
//         return () => {
//             if (soundInstance) {
//                 soundInstance.stop(() => soundInstance.release());
//             }
//         };
//     }, [soundInstance]);

//     const handlePlayPause = () => {
//         // Stop current audio if playing
//         if (soundInstance) {
//             soundInstance.stop(() => {
//                 soundInstance.release();
//                 setSoundInstance(null);
//                 setPlayingMsgId(null);
//                 setIsPlaying(false);
//             });
//             if (isPlaying) return;
//         }

//         setProcessing(true);
//         const filePath = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;

//         const sound = new Sound(filePath, '', (error) => {
//             if (error) {
//                 console.log('Audio load error:', error);
//                 setProcessing(false);
//                 return;
//             }

//             setProcessing(false);
//             setSoundInstance(sound);
//             setPlayingMsgId(messageId);
//             setIsPlaying(true);
//             setDuration(sound.getDuration());

//             // Interval for updating currentTime
//             const interval = setInterval(() => {
//                 if (sound) {
//                     sound.getCurrentTime((sec) => setCurrentTime(sec));
//                 } else {
//                     clearInterval(interval);
//                 }
//             }, 500);

//             sound.play((success) => {
//                 clearInterval(interval);
//                 setPlayingMsgId(null);
//                 setSoundInstance(null);
//                 setCurrentTime(0);
//                 setIsPlaying(false);
//                 sound.release();
//             });
//         });
//     };

//     const formatTime = (sec) => {
//         const minutes = Math.floor(sec / 60);
//         const seconds = Math.floor(sec % 60);
//         return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
//     };

//     return (
//         <View
//             style={{
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 padding: 10,
//                 backgroundColor: '#f0f0f0',
//                 borderRadius: 10,
//                 margin: 5,
//             }}
//         >
//             <TouchableOpacity onPress={handlePlayPause}>
//                 <Icon
//                     name={isPlaying ? 'pause-circle' : 'play-circle'}
//                     size={30}
//                     color="#1E90FF"
//                 />
//             </TouchableOpacity>

//             <View style={{ marginLeft: 10 }}>
//                 {processing ? (
//                     <Text>⏳ Processing...</Text>
//                 ) : (
//                     <Text>
//                         {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}
//                     </Text>
//                 )}
//             </View>
//         </View>
//     );
// };

// export default AudioMessage;


import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import Sound from "react-native-sound";
import RNFetchBlob from "react-native-blob-util";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const AudioMessage = ({ audioUri, messageId, playingMsgId, setPlayingMsgId }) => {
    const [soundInstance, setSoundInstance] = useState(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [localPath, setLocalPath] = useState(null);
    const [isPlayingLocal, setIsPlayingLocal] = useState(false);

    const intervalRef = useRef(null);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        isPlayingRef.current = isPlayingLocal;
    }, [isPlayingLocal]);

    useEffect(() => {
        return () => {
            if (soundInstance) {
                soundInstance.stop(() => soundInstance.release());
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [soundInstance]);

    useEffect(() => {
        // Check if local file already exists
        const checkLocalFile = async () => {
            const dirs = RNFetchBlob.fs.dirs;
            const path = `${dirs.CacheDir}/${messageId}.mp3`;
            const exists = await RNFetchBlob.fs.exists(path);
            if (exists) setLocalPath(path);
        };
        checkLocalFile();
    }, [audioUri, messageId]);

    const handlePlayPause = async () => {
        // Stop currently playing audio
        if (soundInstance) {
            soundInstance.stop(() => {
                soundInstance.release();
                setSoundInstance(null);
                setPlayingMsgId(null);
                setIsPlayingLocal(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
            });
            if (isPlayingLocal) return;
        }

        setProcessing(true);
        setPlayingMsgId(messageId);
        setIsPlayingLocal(true);

        let pathToPlay = localPath;

        // If server URL and not cached, download first
        if (audioUri.startsWith("http") && !pathToPlay) {
            try {
                const dirs = RNFetchBlob.fs.dirs;
                const path = `${dirs.CacheDir}/${messageId}.mp3`;
                const res = await RNFetchBlob.config({ path }).fetch("GET", audioUri);
                pathToPlay = res.path();
                setLocalPath(pathToPlay); // save for future
            } catch (err) {
                console.log("❌ Audio download failed:", err);
                setProcessing(false);
                setPlayingMsgId(null);
                setIsPlayingLocal(false);
                return;
            }
        }
        // If it's already a local file path (file:// or relative), use directly
        else if (!pathToPlay && !audioUri.startsWith("http")) {
            pathToPlay = audioUri.startsWith("file://") ? audioUri : `file://${audioUri}`;
            setLocalPath(pathToPlay);
        }

        setProcessing(false);

        const sound = new Sound(pathToPlay, "", (error) => {
            if (error) {
                console.log("❌ Audio load error:", error);
                setPlayingMsgId(null);
                setIsPlayingLocal(false);
                return;
            }

            setSoundInstance(sound);
            setDuration(sound.getDuration());
            setCurrentTime(0);

            intervalRef.current = setInterval(() => {
                if (sound && isPlayingRef.current) {
                    sound.getCurrentTime((sec) => setCurrentTime(sec));
                } else {
                    clearInterval(intervalRef.current);
                }
            }, 500);

            sound.play((success) => {
                setPlayingMsgId(null);
                setSoundInstance(null);
                setCurrentTime(0);
                setIsPlayingLocal(false);
                clearInterval(intervalRef.current);
                sound.release();
            });
        });
    };

    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60);
        const seconds = Math.floor(sec % 60);
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                backgroundColor: "#f0f0f0",
                borderRadius: 10,
                margin: 5,
            }}
        >
            <TouchableOpacity onPress={handlePlayPause}>
                {processing ? (
                    <ActivityIndicator size="small" color="#1E90FF" />
                ) : (
                    <Icon
                        name={isPlayingLocal ? "pause-circle" : "play-circle"}
                        size={30}
                        color="#1E90FF"
                    />
                )}
            </TouchableOpacity>

            <View style={{ marginLeft: 10 }}>
                {processing ? (
                    <Text>⏳ Processing...</Text>
                ) : (
                    <Text>
                        {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}
                    </Text>
                )}
            </View>
        </View>
    );
};

export default AudioMessage;






