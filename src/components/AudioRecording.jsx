import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, PermissionsAndroid, Platform } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AudioRecorderComponent = ({ onSend, currentUserId }) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false); // <-- track initialization
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        if (
          permissions[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== 'granted'
        ) {
          console.log('❌ RECORD_AUDIO permission not granted');
          return;
        }
      }

      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        wavFile: `audio_${Date.now()}.wav`,
      });

      setReady(true); // initialization complete
      console.log('✅ AudioRecord initialized');
    };

    init();
  }, []);

  const startRecording = () => {
    if (!ready) {
      console.log('❌ AudioRecord not ready yet');
      return;
    }

    setRecording(true);
    setDuration(0);
    console.log('🎙️ Recording started...');
    AudioRecord.start();

    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      const filePath = await AudioRecord.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      console.log('🛑 Recording stopped. File saved at:', filePath);

      if (onSend && filePath) {
        onSend({
          fileUri: filePath,
          fileName: `audio_${Date.now()}.wav`,
          type: 'audio',
          text: '',
        });
      }
    } catch (err) {
      console.log('❌ Error stopping recording:', err);
    }
  };

  const formatTime = sec => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={!ready} // disable until ready
        style={{
          backgroundColor: recording ? 'red' : '#1E90FF',
          padding: 10,
          borderRadius: 25,
          marginRight: 8,
          opacity: ready ? 1 : 0.5,
        }}
      >
        <Icon name={recording ? 'stop-circle' : 'microphone'} size={24} color="#fff" />
      </TouchableOpacity>
      {recording && <Text style={{ color: 'red', fontSize: 14 }}>{formatTime(duration)}</Text>}
    </View>
  );
};

export default AudioRecorderComponent;
