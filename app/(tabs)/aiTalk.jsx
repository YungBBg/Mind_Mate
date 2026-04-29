import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import { db } from '../../firebase/config';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import {
  collection,
  addDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

// ================== SWITCH API HERE ==================
// Option 1: Groq (Recommended for testing - fast + high quota)
// import { Groq } from 'groq-sdk';

// const client = new Groq({
//   apiKey: "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",  
// });

// Option 2: ChatAnywhere (uncomment if you want to use it instead)
import OpenAI from 'openai';
const client = new OpenAI({
  apiKey: "sk-FJ0v0FHLRft6xMBPcAkl9EfVWhGLq24APAExA2CBhKIz2E6X",
  baseURL: "https://api.chatanywhere.tech/v1",
  dangerouslyAllowBrowser: true
});

// =====================================================

export default function AiTalkScreen() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const flatListRef = useRef(null);

  // Strong Mental Health System Prompt
  const SYSTEM_PROMPT = `You are MindMate, a compassionate, warm, and highly empathetic mental health companion.

    Your only purpose is to provide emotional support, active listening, and gentle encouragement.

    Core rules you must always follow:
    - Be kind, patient, and non-judgmental at all times.
    - Validate the user's feelings first before giving any suggestions.
    - Use warm, calming, and supportive language.
    - Never diagnose, never give medical advice, and never act like a therapist.
    - If the user mentions self-harm, suicide, or severe distress, gently encourage them to seek immediate professional help or contact a helpline.
    - Keep responses relatively short and easy to read (2-5 sentences).
    - Ask gentle open-ended questions to help them express themselves.
    - Never rush or pressure the user.

    Remember: Your role is to be a caring friend who listens and supports, not a doctor.`;

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const loadChatHistory = useCallback(async (uid) => {
    try {
      setIsLoadingHistory(true);
      const chatsRef = collection(db, 'users', uid, 'aiChats');
      const chatsQuery = query(chatsRef, orderBy('createdAt', 'asc'), limit(50));
      const snapshot = await getDocs(chatsQuery);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        role: doc.data().role,
        content: doc.data().content,
      }));
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }
    loadChatHistory(user.uid);
  }, [user, loadChatHistory]);

  const saveChatMessage = async (uid, message) => {
    const chatsRef = collection(db, 'users', uid, 'aiChats');
    await addDoc(chatsRef, {
      role: message.role,
      content: message.content,
      createdAt: serverTimestamp(),
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;
    if (!user?.uid) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Please log in first to use AI Talk.',
      }]);
      return;
    }

    const userMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: inputText 
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setLoading(true);

    try {
      await saveChatMessage(user.uid, userMsg);

      const completion = await client.chat.completions.create({
        // model: "llama-3.3-70b-versatile",   // Groq model (good for mental health)
        model: "gpt-4o-mini",               

        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      const aiContent = completion.choices[0]?.message?.content || 
                       "I'm sorry, I couldn't generate a response right now.";

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: aiContent 
      }]);
      await saveChatMessage(user.uid, {
        role: 'assistant',
        content: aiContent,
      });

    } catch (error) {
      console.error("AI Error:", error);
      let errorMsg = "Sorry, something went wrong. Please try again.";

      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        errorMsg = "The AI is currently busy. Please try again in a moment.";
      } else if (
        error.message?.includes('402') ||
        error.message?.toLowerCase().includes('subscription')
      ) {
        errorMsg = "This model requires an active provider subscription. Please switch API/model settings.";
      }

      const assistantErrorMsg = { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: errorMsg 
      };
      setMessages(prev => [...prev, assistantErrorMsg]);
      try {
        await saveChatMessage(user.uid, assistantErrorMsg);
      } catch (saveError) {
        console.error('Failed to save error message:', saveError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

    return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary2]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>MindMate - Mental Health Chat</Text>
          <Text style={styles.headerSubtitle}>A calm place to talk</Text>
        </LinearGradient>

        {/* Messages Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <View style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble
            ]}>
              <Text style={item.role === 'user' ? styles.userText : styles.aiText}>
                {item.content}
              </Text>
            </View>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isLoadingHistory ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.emptyText}>Loading chat history...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Start a conversation with MindMate.</Text>
              </View>
            )
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}   
          style={styles.inputWrapper}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Share how you're feeling..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={loading || !inputText.trim()}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { 
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#fff',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  listContent: { padding: 15, paddingBottom: 120 },
  bubble: { 
    padding: 14, 
    borderRadius: 18, 
    marginVertical: 6, 
    maxWidth: '85%' 
  },
  userBubble: { 
    alignSelf: 'flex-end', 
    backgroundColor: theme.colors.userBubble,
  },
  aiBubble: { 
    alignSelf: 'flex-start', 
    backgroundColor: theme.colors.aiBubble,
    borderWidth: 1,
    borderColor: theme.colors.aiBubbleBorder,
  },
  userText: { color: '#FFF', fontSize: 16 },
  aiText: { color: theme.colors.aiText, fontSize: 16, lineHeight: 22 },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    alignItems: 'center' 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 25, 
    paddingHorizontal: 18, 
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    maxHeight: 120, 
  },
  sendButton: { 
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22, 
    paddingVertical: 12, 
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70
  },
  sendButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
});