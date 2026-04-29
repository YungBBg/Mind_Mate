import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut, onAuthStateChangedListener } from '../../services/firebaseAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { getUserMoodEntries } from '../../services/moodService';

const MOOD_EMOJI_MAP = {
  'very-happy': '😄',
  'happy': '😊',
  'neutral': '😐',
  'sad': '😢',
  'very-sad': '😭',
  'anxious': '😰',
  'angry': '😠',
  'excited': '🤩',
  'calm': '😌',
  'stressed': '😓',
};

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const [todayMood, setTodayMood] = useState(null);
  const [recentMoods, setRecentMoods] = useState([]);

  // Load mood data
  const loadMoods = useCallback(async () => {
    if (!user) return;

    try {
      const entries = await getUserMoodEntries(user.uid);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const todayEntry = entries.find(entry => entry.date === today);
      setTodayMood(todayEntry || null);

      // Get recent entries (last 7 days)
      const sortedEntries = entries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);
      setRecentMoods(sortedEntries);
    } catch (error) {
      console.error('Error loading moods:', error);
    }
  }, [user]);

  // Load mood data when user is loaded
  useEffect(() => {
    if (user) {
      loadMoods();
    }
  }, [user, loadMoods]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadMoods();
      }
    }, [user, loadMoods])
  );

  // Auto refresh every 60 seconds while user is logged in
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      loadMoods();
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, loadMoods]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', error.message || 'Logout failed');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Hello {user?.displayName || user?.email?.split('@')[0] || 'Guest'}!
            </Text>
            <Text style={styles.subtitle}>How are you feeling today?</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Today's Mood Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Mood</Text>
          {todayMood ? (
            <View style={styles.moodDisplay}>
              <Text style={styles.moodEmoji}>
                {MOOD_EMOJI_MAP[todayMood.mood] || '😐'}
              </Text>
              <Text style={styles.moodText}>{todayMood.mood.replace('-', ' ').toUpperCase()}</Text>
              <Text style={styles.intensityText}>
                Intensity: {todayMood.intensity}/10
              </Text>
              {todayMood.notes && (
                <Text style={styles.notesText}>{todayMood.notes}</Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No mood recorded for today</Text>
              <TouchableOpacity
                style={styles.recordButton}
                onPress={() => router.push('/(tabs)/mood-entry')}
              >
                <Text style={styles.recordButtonText}>Record Your Mood</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/mood-entry')}
          >
            <Ionicons name="add-circle" size={32} color="#667eea" />
            <Text style={styles.actionText}>Record Mood</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/calendar')}
          >
            <Ionicons name="calendar" size={32} color="#667eea" />
            <Text style={styles.actionText}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/statistics')}
          >
            <Ionicons name="stats-chart" size={32} color="#667eea" />
            <Text style={styles.actionText}>Statistics</Text>
          </TouchableOpacity><TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/aiTalk')}
          >
            <Ionicons name="happy-outline" size={32} color="#667eea" />
            <Text style={styles.actionText}>AI Talk</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Moods */}
        {recentMoods.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Moods</Text>
            {recentMoods.map((mood) => (
              <View key={mood.id} style={styles.recentMoodItem}>
                <Text style={styles.recentMoodEmoji}>
                  {MOOD_EMOJI_MAP[mood.mood] || '😐'}
                </Text>
                <View style={styles.recentMoodInfo}>
                  <Text style={styles.recentMoodDate}>
                    {format(new Date(mood.date), 'MMM dd, yyyy')}
                  </Text>
                  <Text style={styles.recentMoodType}>
                    {mood.mood.replace('-', ' ')}
                  </Text>
                </View>
                <Text style={styles.recentIntensity}>{mood.intensity}/10</Text>
              </View>
            ))}
          </View>
        )}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  card: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  moodDisplay: {
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  moodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  intensityText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  recordButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentMoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentMoodEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  recentMoodInfo: {
    flex: 1,
  },
  recentMoodDate: {
    fontSize: 14,
    color: '#666',
  },
  recentMoodType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  recentIntensity: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});