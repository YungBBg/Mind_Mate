import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import { saveThought, getUserThoughts } from '../../services/moodService';
import { format, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

export default function ThoughtsScreen() {
  const [user, setUser] = useState(null);

  const [thoughts, setThoughts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [thoughtText, setThoughtText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('neutral');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const loadThoughts = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userThoughts = await getUserThoughts(user.uid);
      const sortedThoughts = userThoughts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setThoughts(sortedThoughts);
    } catch (error) {
      console.error('Error loading thoughts:', error);
      Alert.alert('Error', 'Failed to load thoughts');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadThoughts();
    } else {
      setIsLoading(false);
    }
  }, [user, loadThoughts]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadThoughts();
      }
    }, [user, loadThoughts])
  );

  // Auto refresh thoughts every minute
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      loadThoughts();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user, loadThoughts]);

  const handleSaveThought = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (!thoughtText.trim()) {
      Alert.alert('Error', 'Please write something');
      return;
    }

    setIsSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveThought(user.uid, today, thoughtText.trim(), selectedCategory);
      
      Alert.alert('Success', 'Thought saved successfully!', [
        { text: 'OK', onPress: () => {
          setIsModalVisible(false);
          setThoughtText('');
          setSelectedCategory('neutral');
          loadThoughts();
        }},
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save thought');
    } finally {
      setIsSaving(false);
    }
  };

  
  const getThoughtEmoji = (category) => {
    if (category === 'WATCH') return '⌚️';
    if (category === 'positive') return '😊';
    if (category === 'negative') return '😔';
    return '😐'; 
  };

  if (isLoading) {
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
        <Text style={styles.headerTitle}>My Thoughts</Text>
        <Text style={styles.headerSubtitle}>Record your daily reflections</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New Thought</Text>
          </TouchableOpacity>

          {thoughts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No thoughts recorded yet</Text>
              <Text style={styles.emptySubtext}>
                Start by adding your first thought to reflect on your day
              </Text>
            </View>
          ) : (
            thoughts.map((thought) => (
              <View key={thought.id} style={styles.thoughtCard}>
                <View style={styles.thoughtHeader}>
                  <View style={styles.thoughtHeaderLeft}>
                    <Text style={styles.thoughtEmoji}>
                      {getThoughtEmoji(thought.category)}
                    </Text>
                    <View>
                      <Text style={styles.thoughtDate}>
                        {thought.date ? format(parseISO(thought.date), 'MMMM dd, yyyy') : 'Date unknown'}
                      </Text>
                      <View style={[
                        styles.categoryBadge,
                        { 
                          backgroundColor: 
                            thought.category === 'WATCH' ? '#007AFF' :  // 手錶用藍色
                            thought.category === 'positive' ? '#4CAF50' :
                            thought.category === 'negative' ? '#F44336' : '#9E9E9E'
                        }
                      ]}>
                        <Text style={styles.categoryText}>
                          {thought.category === 'WATCH' ? 'WATCH' : thought.category.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.thoughtTime}>
                    {thought.createdAt ? format(thought.createdAt.toDate(), 'hh:mm a') : 'Time unknown'}
                  </Text>
                </View>
                <Text style={styles.thoughtText}>{thought.thoughts}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>New Thought</Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Category</Text>
                  <View style={styles.categorySelector}>
                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        selectedCategory === 'positive' && styles.categoryOptionActive,
                        { borderColor: '#4CAF50' },
                      ]}
                      onPress={() => setSelectedCategory('positive')}
                    >
                      <Text style={styles.categoryOptionEmoji}>😊</Text>
                      <Text style={[styles.categoryOptionText, selectedCategory === 'positive' && styles.categoryOptionTextActive]}>Positive</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        selectedCategory === 'neutral' && styles.categoryOptionActive,
                        { borderColor: '#9E9E9E' },
                      ]}
                      onPress={() => setSelectedCategory('neutral')}
                    >
                      <Text style={styles.categoryOptionEmoji}>😐</Text>
                      <Text style={[styles.categoryOptionText, selectedCategory === 'neutral' && styles.categoryOptionTextActive]}>Neutral</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        selectedCategory === 'negative' && styles.categoryOptionActive,
                        { borderColor: '#F44336' },
                      ]}
                      onPress={() => setSelectedCategory('negative')}
                    >
                      <Text style={styles.categoryOptionEmoji}>😔</Text>
                      <Text style={[styles.categoryOptionText, selectedCategory === 'negative' && styles.categoryOptionTextActive]}>Negative</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Your Thoughts</Text>
                  <TextInput
                    style={styles.modalInput}
                    multiline
                    numberOfLines={8}
                    value={thoughtText}
                    onChangeText={setThoughtText}
                    placeholder="What's on your mind today?"
                    placeholderTextColor="#999"
                  />

                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveThought}
                    disabled={isSaving}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSaving ? 'Saving...' : 'Save Thought'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  content: {
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  thoughtCard: {
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
  thoughtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  thoughtHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  thoughtEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  thoughtDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  thoughtTime: {
    fontSize: 12,
    color: '#999',
  },
  thoughtText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 4,
    backgroundColor: '#fafafa',
  },
  categoryOptionActive: {
    backgroundColor: '#f0f0ff',
    borderWidth: 6,
  },
  categoryOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    minHeight: 180,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
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