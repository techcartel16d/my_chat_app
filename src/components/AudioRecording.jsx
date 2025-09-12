

// import React, { useState, useEffect, useRef } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     PermissionsAndroid,
//     Platform,
// } from 'react-native';
// import AudioRecord from 'react-native-audio-record';
// import Sound from 'react-native-sound';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// const AudioRecorderComponent = () => {
//     const [recording, setRecording] = useState(false);
//     const [duration, setDuration] = useState(0);
//     const [audioFile, setAudioFile] = useState(null);
//     const [playing, setPlaying] = useState(false);

//     const timerRef = useRef(null);

//     useEffect(() => {
//         const init = async () => {
//             if (Platform.OS === 'android') {
//                 await PermissionsAndroid.requestMultiple([
//                     PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
//                     PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//                     PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//                 ]);
//             }

//             AudioRecord.init({
//                 sampleRate: 16000,
//                 channels: 1,
//                 bitsPerSample: 16,
//                 wavFile: 'recorded_audio.wav',
//             });
//         };
//         init();
//     }, []);

//     const startRecording = () => {
//         setRecording(true);
//         setDuration(0);
//         setAudioFile(null);
//         console.log('🎙️ Recording started...');
//         AudioRecord.start();

//         timerRef.current = setInterval(() => {
//             setDuration((prev) => prev + 1);
//         }, 1000);
//     };

//     const stopRecording = async () => {
//         let filePath = await AudioRecord.stop();
//         setRecording(false);
//         clearInterval(timerRef.current);
//         setAudioFile(filePath);
//         console.log('🛑 Recording stopped. File saved at:', filePath);
//     };

//     const playAudio = () => {
//         if (!audioFile) return;
//         console.log('▶️ Playing audio:', audioFile);

//         const sound = new Sound(audioFile, '', (error) => {
//             if (error) {
//                 console.log('❌ Failed to load sound', error);
//                 return;
//             }
//             setPlaying(true);
//             sound.play((success) => {
//                 if (success) {
//                     console.log('✅ Finished playing');
//                 } else {
//                     console.log('❌ Playback failed');
//                 }
//                 setPlaying(false);
//                 sound.release();
//             });
//         });
//     };

//     const formatTime = (sec) => {
//         const minutes = Math.floor(sec / 60);
//         const seconds = sec % 60;
//         return `${minutes.toString().padStart(2, '0')}:${seconds
//             .toString()
//             .padStart(2, '0')}`;
//     };

//     return (


//         <View style={{ alignItems: 'center', justifyContent: 'center' }}>
//             {/* Timer */}
//             {recording && (
//                 <Text
//                     style={{
//                         fontSize: 18,
//                         fontWeight: 'bold',
//                         marginBottom: 10,
//                         color: 'red',
//                     }}
//                 >
//                     ⏱ {formatTime(duration)}
//                 </Text>
//             )}

//             {/* Show recorded file path */}
//             {audioFile && !recording && (
//                 <Text
//                     style={{
//                         fontSize: 14,
//                         color: 'black',
//                         marginBottom: 10,
//                         textAlign: 'center',
//                         paddingHorizontal: 20,
//                     }}
//                     numberOfLines={2}
//                 >
//                     📂 Saved File: {audioFile}
//                 </Text>
//             )}

//             {/* Start / Stop buttons */}
//             {!recording ? (
//                 <TouchableOpacity
//                     style={{
//                         backgroundColor: '#1E90FF',
//                         padding: 15,
//                         borderRadius: 50,
//                         marginVertical: 10,
//                         alignItems: 'center',
//                     }}
//                     onPress={startRecording}
//                 >
//                     <Icon name="microphone" size={30} color="#fff" />
//                     <Text style={{ color: '#fff', marginTop: 5, textAlign: 'center' }}>
//                         Start
//                     </Text>
//                 </TouchableOpacity>
//             ) : (
//                 <TouchableOpacity
//                     style={{
//                         backgroundColor: 'red',
//                         padding: 15,
//                         borderRadius: 50,
//                         marginVertical: 10,
//                         alignItems: 'center',
//                     }}
//                     onPress={stopRecording}
//                 >
//                     <Icon name="stop-circle" size={30} color="#fff" />
//                     <Text style={{ color: '#fff', marginTop: 5, textAlign: 'center' }}>
//                         Stop
//                     </Text>
//                 </TouchableOpacity>
//             )}

//             {/* Play button */}
//             {audioFile && !recording && (
//                 <TouchableOpacity
//                     style={{
//                         backgroundColor: playing ? 'gray' : 'green',
//                         padding: 15,
//                         borderRadius: 50,
//                         marginVertical: 10,
//                         alignItems: 'center',
//                     }}
//                     onPress={playAudio}
//                     disabled={playing}
//                 >
//                     <Icon name="play-circle" size={30} color="#fff" />
//                     <Text style={{ color: '#fff', marginTop: 5, textAlign: 'center' }}>
//                         {playing ? 'Playing...' : 'Play'}
//                     </Text>
//                 </TouchableOpacity>
//             )}
//         </View>
//     );
// };

// export default AudioRecorderComponent;

import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, PermissionsAndroid, Platform } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import uuid from 'react-native-uuid';

const AudioRecorderComponent = ({ onSend, currentUserId }) => {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioFile, setAudioFile] = useState(null);
    const [playing, setPlaying] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            if (Platform.OS === 'android') {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);
            }

            AudioRecord.init({
                sampleRate: 16000,
                channels: 1,
                bitsPerSample: 16,
                wavFile: 'audio_record.wav',
            });
        };
        init();
    }, []);

    const startRecording = () => {
        setRecording(true);
        setDuration(0);
        setAudioFile(null);
        AudioRecord.start();

        timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);
    };

    const stopRecording = async () => {
        const filePath = await AudioRecord.stop();
        setRecording(false);
        clearInterval(timerRef.current);
        setAudioFile(filePath);

        // Send audio to API
        if (onSend) {
            const tempId = uuid.v4();
            onSend(
                [
                    {
                        _id: tempId,
                        createdAt: new Date(),
                        user: { _id: currentUserId.toString(), name: 'You' },
                        audio: filePath, // For GiftedChat local preview
                        pending: true,
                    },
                ],
                {
                    fileUri: filePath,
                    fileName: `audio_${Date.now()}.wav`,
                    type: 'audio',
                    text: '', // optional
                }
            );
        }
    };

    const playAudio = () => {
        if (!audioFile) return;
        const filePath = audioFile.startsWith('file://') ? audioFile : `file://${audioFile}`;

        const sound = new Sound(filePath, '', (error) => {
            if (error) return;
            setPlaying(true);
            sound.play((success) => {
                setPlaying(false);
                sound.release();
            });
        });
    };

    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60);
        const seconds = sec % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
            <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={{
                    backgroundColor: recording ? 'red' : '#1E90FF',
                    padding: 10,
                    borderRadius: 25,
                    marginRight: 8,
                }}
            >
                <Icon name="microphone" size={24} color="#fff" />
            </TouchableOpacity>

            {recording && <Text style={{ color: 'red' }}>{formatTime(duration)}</Text>}

            {/* {audioFile && !recording && (
                <TouchableOpacity onPress={playAudio}>
                    <Icon name="play-circle" size={24} color="green" />
                </TouchableOpacity>
            )} */}
        </View>
    );
};

export default AudioRecorderComponent;





