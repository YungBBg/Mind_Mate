import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getUserMoodEntries, getMoodEntryByDate } from '../../services/moodService';
import { format, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const MOOD_COLORS = {
  'very-happy': '#FFD700',
  'happy': '#FFA500',
  'excited': '#FF69B4',
  'calm': '#98FB98',
  'neutral': '#D3D3D3',
  'sad': '#87CEEB',
  'very-sad': '#4169E1',
  'anxious': '#FFB6C1',
  'stressed': '#FF6347',
  'angry': '#DC143C',
};

const MOOD_EMOJI = {
  'very-happy': '😄',
  'happy': '😊',
  'excited': '🤩',
  'calm': '😌',
  'neutral': '😐',
  'sad': '😢',
  'very-sad': '😭',
  'anxious': '😰',
  'stressed': '😓',
  'angry': '😠',
};

export default function CalendarScreen() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [moodEntries, setMoodEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const loadMoodEntries = useCallback(async () => {
    if (!user) return;

    try {
      const entries = await getUserMoodEntries(user.uid);
      setMoodEntries(entries);
    } catch (error) {
      console.error('Error loading mood entries:', error);
      Alert.alert('Error', 'Failed to load mood entries');
    }
  }, [user]);

  const loadSelectedEntry = useCallback(async () => {
    if (!user) return;

    try {
      const entry = await getMoodEntryByDate(user.uid, selectedDate);
      setSelectedEntry(entry);
    } catch (error) {
      console.error('Error loading selected entry:', error);
      setSelectedEntry(null);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (user) {
      loadMoodEntries();
    }
  }, [user, loadMoodEntries]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadMoodEntries();
      }
    }, [user, loadMoodEntries])
  );

  // Auto refresh calendar data every minute
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      loadMoodEntries();
      loadSelectedEntry();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user, loadMoodEntries, loadSelectedEntry]);

  const updateMarkedDates = useCallback(() => {
    const marked = {};
    
    moodEntries.forEach(entry => {
      marked[entry.date] = {
        customStyles: {
          container: {
            backgroundColor: MOOD_COLORS[entry.mood] || '#ddd',
            borderRadius: 8,
          },
          text: {
            color: '#fff',
            fontWeight: 'bold',
          },
        },
      };
    });

    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#667eea',
      selectedTextColor: '#fff',
    };

    setMarkedDates(marked);
  }, [moodEntries, selectedDate]);

  // Update marked dates when entries or selected date change
  useEffect(() => {
    updateMarkedDates();
  }, [moodEntries, selectedDate, updateMarkedDates]);

  // Load selected entry when date changes
  useEffect(() => {
    if (user) {
      loadSelectedEntry();
    }
  }, [selectedDate, user, loadSelectedEntry]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Please login to view calendar</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mood Calendar</Text>
        <Text style={styles.headerSubtitle}>Track your emotional journey</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Calendar
          current={selectedDate}
          onDayPress={onDayPress}
          markedDates={markedDates}
          markingType={'custom'}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#b6c1cd',
            selectedDayBackgroundColor: '#667eea',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#667eea',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            monthTextColor: '#333',
            arrowColor: '#667eea',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
        />

        <View style={styles.entryCard}>
          <Text style={styles.entryCardTitle}>
            Mood on {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
          </Text>
          {selectedEntry ? (
            <View style={styles.entryContent}>
              <View style={styles.moodDisplay}>
                <Text style={styles.moodEmoji}>
                  {MOOD_EMOJI[selectedEntry.mood] || '😐'}
                </Text>
                <View style={styles.moodInfo}>
                  <Text style={styles.moodType}>
                    {selectedEntry.mood.replace('-', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.intensity}>
                    Intensity: {selectedEntry.intensity}/10
                  </Text>
                </View>
              </View>

              <View style={styles.emotionsSection}>
                <Text style={styles.sectionLabel}>Emotions:</Text>
                <View style={styles.emotionsList}>
                  {selectedEntry.emotions.map((emotion, index) => (
                    <View key={index} style={styles.emotionTag}>
                      <Text style={styles.emotionText}>
                        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {selectedEntry.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{selectedEntry.notes}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No mood recorded</Text>
              <Text style={styles.emptySubtext}>Record your mood to see it here</Text>
            </View>
          )}
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Mood Legend</Text>
          <View style={styles.legendGrid}>
            {Object.entries(MOOD_COLORS).map(([mood, color]) => (
              <View key={mood} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>
                  {mood.replace('-', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
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
  content: {
    padding: 20,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  entryCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  entryContent: {
    marginTop: 10,
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  moodEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  moodInfo: {
    flex: 1,
  },
  moodType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  intensity: {
    fontSize: 14,
    color: '#666',
  },
  emotionsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emotionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emotionTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  emotionText: {
    fontSize: 12,
    color: '#666',
  },
  notesSection: {
    marginTop: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  legendCard: {
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
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
});