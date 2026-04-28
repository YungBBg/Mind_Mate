import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView as SafeAreaContext } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import OpenAI from 'openai';
import LottieView from 'lottie-react-native';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

const groq = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.groq.com/openai/v1",
});

export default function AiChat() {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [visibleTextById, setVisibleTextById] = useState({});

  const scrollRef = useRef(null);
  const recordingRef = useRef(null);
  const buttonLottieRef = useRef(null);
  const abortRef = useRef(null);
  const ttsQueueRef = useRef(null); // { id, segments, index }

  const splitIntoSegments = (text) => {
    const raw = (text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!raw) return [];

    // Split by sentence-like punctuation and newlines.
    // Keep it conservative to avoid too many micro segments.
    const rough = raw
      .split(/(?<=[.!?。！？])\s+|\n+/g)
      .map(s => s.trim())
      .filter(Boolean);

    // Merge very short segments into the next one for smoother TTS.
    const merged = [];
    for (const s of rough) {
      if (merged.length === 0) {
        merged.push(s);
        continue;
      }
      const last = merged[merged.length - 1];
      if (last.length < 24) merged[merged.length - 1] = `${last} ${s}`.trim();
      else merged.push(s);
    }

    // Cap segment length so TTS doesn't get too long per chunk.
    const capped = [];
    for (const s of merged) {
      if (s.length <= 220) {
        capped.push(s);
        continue;
      }
      // Soft-split long segments by commas/semicolons
      const parts = s
        .split(/(?<=[,;:，；：])\s+/g)
        .map(p => p.trim())
        .filter(Boolean);
      let buf = '';
      for (const p of parts) {
        if (!buf) buf = p;
        else if ((buf + ' ' + p).length <= 220) buf = `${buf} ${p}`;
        else {
          capped.push(buf);
          buf = p;
        }
      }
      if (buf) capped.push(buf);
    }
    return capped;
  };

  const playNextSegment = () => {
    const q = ttsQueueRef.current;
    if (!q) return;
    if (q.index >= q.segments.length) {
      // Done: reveal full content and clear queue.
      const full = q.segments.join(' ').replace(/\s+/g, ' ').trim();
      setVisibleTextById(prev => ({ ...prev, [q.id]: full }));
      ttsQueueRef.current = null;
      setIsSpeaking(false);
      return;
    }

    const seg = q.segments[q.index];

    // Reveal up to current segment (inclusive) at the moment we start speaking it.
    const revealed = q.segments
      .slice(0, q.index + 1)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    setVisibleTextById(prev => ({ ...prev, [q.id]: revealed }));

    Speech.speak(seg, {
      language: 'en-US',
      onStart: () => setIsSpeaking(true),
      onDone: () => {
        q.index += 1;
        playNextSegment();
      },
      onStopped: () => {
        // user cancelled
        ttsQueueRef.current = null;
        setIsSpeaking(false);
      },
      onError: () => {
        ttsQueueRef.current = null;
        setIsSpeaking(false);
      },
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // 初始停留在第 30 幀，確保一開始就看得到圖形
      buttonLottieRef.current?.play(30, 30); 
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Insufficient permissions", "Please grant microphone permission");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      buttonLottieRef.current?.play();
    } catch (err) {
      Alert.alert("Recording failed", err.message);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsThinking(true);
    buttonLottieRef.current?.pause();
    buttonLottieRef.current?.play(1, 1); // 回到靜止影格

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;

      abortRef.current?.abort?.();
      abortRef.current = new AbortController();

      const formData = new FormData();
      formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' });
      formData.append('model', 'whisper-large-v3');

      const transRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groq.apiKey}` },
        body: formData,
        signal: abortRef.current.signal,
      });

      const transData = await transRes.json();
      const userTranscription = transData.text?.trim();
      if (!userTranscription) { setIsThinking(false); return; }

      // 替換後的 Prompt 邏輯
      const prompt = `Task:
1. First, transcribe the voice message into accurate English text. Put the transcription inside <user>: </user>
2. Then, reply to the user in natural, friendly, conversational English with warmth and personality.
Put your reply inside <reply>: </reply>

Example:
<user>Hi, how are you today?</user>
<reply>Hey! I'm doing great, thanks for asking! How about you?</reply>

Now process this voice message: ${userTranscription}`;

      const sanitizedHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful and warm MINDMATE assistant." },
          ...sanitizedHistory,
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
      });

      const fullOutput = completion.choices[0].message.content;
      
      // 解析標籤內容
      const userMatch = fullOutput.match(/<user>(.*?)<\/user>/s);
      const replyMatch = fullOutput.match(/<reply>(.*?)<\/reply>/s);

      const userText = userMatch ? userMatch[1].trim() : userTranscription;
      const aiReply = replyMatch ? replyMatch[1].trim() : fullOutput.trim();

      const userId = `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const aiId = `a_${Date.now() + 1}_${Math.random().toString(16).slice(2)}`;

      setMessages(prev => [...prev, { id: userId, role: 'user', content: userText }]);
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: aiReply }]);

      const segments = splitIntoSegments(aiReply);
      // If segmenting fails, fall back to single chunk.
      const safeSegments = segments.length ? segments : [aiReply];
      setVisibleTextById(prev => ({ ...prev, [aiId]: '' }));

      Speech.stop(); // stop any previous queued speech
      ttsQueueRef.current = { id: aiId, segments: safeSegments, index: 0 };
      playNextSegment();

    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  const getDisplayText = (msg) => {
    if (msg.role === 'assistant' && msg.id && visibleTextById[msg.id] != null) {
      return visibleTextById[msg.id];
    }
    return msg.content;
  };

  const cancelOverlay = () => {
    abortRef.current?.abort?.();
    abortRef.current = null;
    Speech.stop();
    ttsQueueRef.current = null;
    setIsThinking(false);
    setIsSpeaking(false);
  };

  return (
    <SafeAreaContext style={styles.container}>
      <LinearGradient
        colors={['#E8EEFF', '#EEF2FF', '#F8F5FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pageBg}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
      >
        <View style={styles.topCard}>
          <Text style={styles.topBadge}>Voice Assistant</Text>
          <Text style={styles.topTitle}>Talk naturally with MindMate</Text>
          <Text style={styles.topSubtitle}>Press and hold the mic button, then release to get a spoken reply.</Text>
        </View>

        {messages.map((msg, index) => (
          <View
            key={msg.id ?? index}
            style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
              {getDisplayText(msg)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.micContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={styles.lottieButtonWrapper}
        >
          <LottieView
            ref={buttonLottieRef}
            source={require('../../assets/buttom-voice.json')}
            style={styles.buttonLottie}
            loop={true}
            autoPlay={false}
          />
          <Text style={styles.micHintText}>
            {isRecording ? "Release to end recording" : "Press and hold to speak"}
          </Text>
        </TouchableOpacity>
      </View>

      {(isThinking || isSpeaking) && (
        <Pressable style={styles.fullscreenAnimationOverlay} onPress={cancelOverlay}>
          <View style={styles.darkenBackground} />
          <LottieView
            source={require('../../assets/voice-wave.json')}
            autoPlay
            loop
            style={styles.lottieAnimationLarge}
          />
          <Text style={styles.statusTextLarge}>
            {isThinking ? "AI is thinking..." : "AI is replying..."}
          </Text>
          <Text style={styles.tapToCancel}>Tap to cancel</Text>
        </Pressable>
      )}
    </SafeAreaContext>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  pageBg: {
    ...StyleSheet.absoluteFillObject,
  },
  chatArea: { flex: 1, paddingHorizontal: theme.spacing.lg },
  chatContent: { paddingBottom: 210, paddingTop: 14 },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...theme.shadowCard,
  },
  topBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  topTitle: { marginTop: 10, color: '#111827', fontSize: 19, fontWeight: '800' },
  topSubtitle: { marginTop: 4, color: '#6B7280', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  messageBubble: {
    maxWidth: '86%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginVertical: 6,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.userBubble },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.aiBubble,
    borderWidth: 1,
    borderColor: theme.colors.aiBubbleBorder,
  },
  userText: { color: theme.colors.userText, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  aiText: { color: theme.colors.aiText, fontSize: 16, lineHeight: 22 },
  micContainer: { 
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...theme.shadowCard,
  },
  buttonLottie: { 
    width: 200,
    height: 200, 
  },
  micHintText: {
    marginTop: -20,
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  fullscreenAnimationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  darkenBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  lottieAnimationLarge: { width: width, height: height * 0.4 },
  statusTextLarge: { color: '#a5b4fc', fontSize: 18, fontWeight: '700', marginTop: -20 },
  tapToCancel: { marginTop: 10, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
});