import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import { saveMoodEntry, getMoodEntryByDate } from '../../services/moodService';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

const MOODS = [
  { type: 'very-happy', emoji: '😄', label: 'Very Happy', color: '#FFD700' },
  { type: 'happy', emoji: '😊', label: 'Happy', color: '#FFA500' },
  { type: 'excited', emoji: '🤩', label: 'Excited', color: '#FF69B4' },
  { type: 'calm', emoji: '😌', label: 'Calm', color: '#98FB98' },
  { type: 'neutral', emoji: '😐', label: 'Neutral', color: '#D3D3D3' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: '#87CEEB' },
  { type: 'very-sad', emoji: '😭', label: 'Very Sad', color: '#4169E1' },
  { type: 'anxious', emoji: '😰', label: 'Anxious', color: '#FFB6C1' },
  { type: 'stressed', emoji: '😓', label: 'Stressed', color: '#FF6347' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: '#DC143C' },
];

const EMOTIONS = [
  { type: 'joy', label: 'Joy' },
  { type: 'sadness', label: 'Sadness' },
  { type: 'anger', label: 'Anger' },
  { type: 'fear', label: 'Fear' },
  { type: 'surprise', label: 'Surprise' },
  { type: 'love', label: 'Love' },
  { type: 'anxiety', label: 'Anxiety' },
  { type: 'calm', label: 'Calm' },
  { type: 'excitement', label: 'Excitement' },
  { type: 'stress', label: 'Stress' },
  { type: 'hope', label: 'Hope' },
  { type: 'gratitude', label: 'Gratitude' },
  { type: 'loneliness', label: 'Loneliness' },
  { type: 'confidence', label: 'Confidence' },
];

export default function MoodEntryScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [intensity, setIntensity] = useState(5);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  // Load existing mood entry when user is loaded
  useEffect(() => {
    if (user) {
      loadExistingEntry();
    } else {
      setIsLoadingExisting(false);
    }
  }, [user]);

  const loadExistingEntry = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const entry = await getMoodEntryByDate(user.uid, today);
      if (entry) {
        setSelectedMood(entry.mood);
        setSelectedEmotions(entry.emotions);
        setIntensity(entry.intensity);
        setNotes(entry.notes);
      }
    } catch (error) {
      console.error('Error loading existing entry:', error);
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (!selectedMood) {
      Alert.alert('Error', 'Please select a mood');
      return;
    }

    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveMoodEntry(
        user.uid,
        today,
        selectedMood,
        selectedEmotions,
        intensity,
        notes.trim()
      );
      Alert.alert('Success', 'Mood saved successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save mood');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmotion = (emotion) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        return prev.filter(e => e !== emotion);
      } else {
        return [...prev, emotion];
      }
    });
  };

  if (isLoadingExisting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

      return (
        <View style={styles.container}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>Record Your Mood</Text>
            <Text style={styles.headerSubtitle}>How are you feeling today?</Text>
          </LinearGradient>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}   // Important for iOS
          >
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Your Mood</Text>
                <View style={styles.moodGrid}>
                  {MOODS.map((mood) => (
                    <TouchableOpacity
                      key={mood.type}
                      style={[
                        styles.moodOption,
                        selectedMood === mood.type ? styles.moodOptionSelected : null,
                        { borderColor: mood.color },
                      ]}
                      onPress={() => setSelectedMood(mood.type)}
                    >
                      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                      <Text style={styles.moodLabel}>{mood.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Intensity: {intensity}</Text>
                <View style={styles.intensityContainer}>
                  {[...Array(10)].map((_, index) => {
                    const value = index + 1;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.intensityButton,
                          value === intensity && styles.intensityButtonActive,
                        ]}
                        onPress={() => setIntensity(value)}
                      >
                        <Text style={[
                          styles.intensityText,
                          value === intensity && styles.intensityTextActive,
                        ]}>
                          {value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emotions (Select any)</Text>
                <View style={styles.emotionsContainer}>
                  {EMOTIONS.map((emotion) => (
                    <TouchableOpacity
                      key={emotion.type}
                      style={[
                        styles.emotionChip,
                        selectedEmotions.includes(emotion.type) && styles.emotionChipSelected,
                      ]}
                      onPress={() => toggleEmotion(emotion.type)}
                    >
                      <Text style={[
                        styles.emotionText,
                        selectedEmotions.includes(emotion.type) && styles.emotionTextSelected,
                      ]}>
                        {emotion.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={5}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Mood'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,    
  },

  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodOption: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  moodOptionSelected: {
    backgroundColor: '#f0f0ff',
    borderWidth: 6,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 5,
  },
  moodLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  intensityButton: {
    width: '9%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  intensityButtonActive: {
    backgroundColor: '#667eea',
  },
  intensityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  intensityTextActive: {
    color: '#fff',
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emotionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  emotionChipSelected: {
    backgroundColor: '#667eea',
  },
  emotionText: {
    fontSize: 14,
    color: '#666',
  },
  emotionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    minHeight: 120,
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});