
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import Sound from 'react-native-sound';
import RNFetchBlob from 'react-native-blob-util';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AudioMessage = ({ audioUri, messageId, playingMsgId, setPlayingMsgId, isCurrentUser }) => {
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
    // Cleanup sound instance and interval on unmount
    return () => {
      if (soundInstance) {
        soundInstance.stop(() => soundInstance.release());
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [soundInstance]);

  useEffect(() => {
    const loadAudioMetadata = async () => {
      if (!audioUri) {
        console.log('❌ No audioUri provided');
        return;
      }

      setProcessing(true);
      let pathToLoad = audioUri;

      // Check if a cached file exists
      const ext = audioUri.includes('.wav') ? 'wav' : audioUri.includes('.m4a') ? 'm4a' : 'mp3';
      const cachePath = `${RNFetchBlob.fs.dirs.CacheDir}/${messageId}.${ext}`;
      const exists = await RNFetchBlob.fs.exists(cachePath);

      if (exists) {
        console.log('✅ Found cached audio:', cachePath);
        pathToLoad = cachePath;
        setLocalPath(cachePath);
      } else if (audioUri.startsWith('http')) {
        // Download remote audio if not cached
        try {
          console.log('⬇️ Downloading audio:', audioUri);
          const res = await RNFetchBlob.config({ path: cachePath }).fetch('GET', audioUri);
          pathToLoad = res.path();
          setLocalPath(pathToLoad);
          console.log('✅ Audio downloaded to:', pathToLoad);
        } catch (err) {
          console.log('❌ Audio download failed:', err);
          setProcessing(false);
          return;
        }
      } else if (!audioUri.startsWith('file://')) {
        // Assume local file needs file:// prefix
        pathToLoad = `file://${audioUri}`;
        setLocalPath(pathToLoad);
        console.log('📁 Using local audio:', pathToLoad);
      }

      // Load audio metadata to get duration
      const sound = new Sound(pathToLoad, '', (error) => {
        if (error) {
          console.log('❌ Audio load error:', error, 'Path:', pathToLoad);
          setProcessing(false);
          return;
        }

        setDuration(sound.getDuration());
        // console.log('🎵 Audio duration loaded:', sound.getDuration());
        sound.release(); // Release immediately since we're not playing
        setProcessing(false);
      });
    };

    loadAudioMetadata();
  }, [audioUri, messageId]);

  const handlePlayPause = async () => {
    if (!audioUri || !localPath) {
      console.log('❌ No audioUri or localPath available');
      return;
    }

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

    const sound = new Sound(localPath, '', (error) => {
      if (error) {
        console.log('❌ Audio load error:', error, 'Path:', localPath);
        setProcessing(false);
        setPlayingMsgId(null);
        setIsPlayingLocal(false);
        return;
      }

      setSoundInstance(sound);
      setDuration(sound.getDuration());
      setCurrentTime(0);
      setProcessing(false);

      intervalRef.current = setInterval(() => {
        if (sound && isPlayingRef.current) {
          sound.getCurrentTime((sec) => setCurrentTime(sec));
        } else {
          clearInterval(intervalRef.current);
        }
      }, 500);

      sound.play((success) => {
        console.log('🎵 Playback finished:', success ? 'Success' : 'Failed');
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
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: isCurrentUser ? '#DCF8C6' : '#E5E7EB',
        borderRadius: 15,
        margin: 5,
        maxWidth: '100%',
      }}
    >
      <TouchableOpacity onPress={handlePlayPause} disabled={processing}>
        {processing ? (
          <ActivityIndicator size="small" color="#1E90FF" />
        ) : (
          <Icon
            name={isPlayingLocal ? 'pause-circle' : 'play-circle'}
            size={30}
            color="#1E90FF"
          />
        )}
      </TouchableOpacity>
      <View style={{ marginLeft: 10 }}>
        {processing ? (
          <Text style={{ color: '#6B7280' }}>⏳ Processing...</Text>
        ) : (
          <Text style={{ color: '#1F2937' }}>
            {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}
          </Text>
        )}
      </View>
    </View>
  );
};

export default AudioMessage;
