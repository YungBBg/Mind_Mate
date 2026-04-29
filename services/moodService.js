import { db } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { recomputeAndSaveAchievements } from './achievementService';

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

// Helper: Get mood entries collection for a user
const getMoodEntriesCollection = (userId) => collection(db, 'users', userId, 'moodEntries');

// Save or update mood entry (upsert by date)
export const saveMoodEntry = async (
  userId,
  date,           // string 'yyyy-MM-dd'
  mood,
  emotions,       // array
  intensity,      // number
  notes           // string
) => {
  try {
    const entryId = `mood_${date}`; // Use date as ID to avoid duplicates for same day
    const entryRef = doc(getMoodEntriesCollection(userId), entryId);

    const entryData = {
      id: entryId,
      userId,
      date,
      mood,
      emotions,
      intensity,
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(entryRef, entryData, { merge: true }); // merge = update if exists

    // Keep mood save resilient even if achievement sync fails.
    try {
      await recomputeAndSaveAchievements(userId);
    } catch (achievementError) {
      console.warn('Achievement sync failed:', achievementError);
    }

    return entryId;
  } catch (error) {
    console.error('Failed to save mood entry:', error);
    throw new Error('Save failed');
  }
};

// Get mood entry by date
export const getMoodEntryByDate = async (userId, date) => {
  try {
    const entryId = `mood_${date}`;
    const entryRef = doc(getMoodEntriesCollection(userId), entryId);
    const entrySnap = await getDoc(entryRef);

    if (entrySnap.exists()) {
      return { id: entrySnap.id, ...entrySnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Failed to get mood entry:', error);
    throw new Error('Failed to get mood entry');
  }
};

// Get all mood entries for a user (sorted by date desc)
export const getUserMoodEntries = async (userId) => {
  try {
    const moodCol = getMoodEntriesCollection(userId);
    const q = query(moodCol, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);

    const entries = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    return entries;
  } catch (error) {
    console.error('Failed to get mood entries:', error);
    throw new Error('Failed to get mood entries');
  }
};

// Get weekly statistics
export const getWeeklyStats = async (userId, weekStart) => {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const entries = await getUserMoodEntries(userId);

  const weekEntries = entries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
  });

  const moodDistribution = {
    'very-happy': 0, 'happy': 0, 'neutral': 0, 'sad': 0, 'very-sad': 0,
    'anxious': 0, 'angry': 0, 'excited': 0, 'calm': 0, 'stressed': 0,
  };

  let totalIntensity = 0;
  const emotionCount = {};

  weekEntries.forEach(entry => {
    moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
    totalIntensity += entry.intensity;
    entry.emotions.forEach(emotion => {
      emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
    });
  });

  const averageIntensity = weekEntries.length > 0 ? totalIntensity / weekEntries.length : 0;

  const topEmotions = Object.entries(emotionCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([emotion]) => emotion);

  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    moodDistribution,
    averageIntensity: Math.round(averageIntensity * 10) / 10,
    topEmotions,
    totalEntries: weekEntries.length,
  };
};

// Get monthly statistics (same aggregation as weekly, calendar month range)
export const getMonthlyStats = async (userId, month) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const entries = await getUserMoodEntries(userId);

  const monthEntries = entries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
  });

  const moodDistribution = {
    'very-happy': 0, 'happy': 0, 'neutral': 0, 'sad': 0, 'very-sad': 0,
    'anxious': 0, 'angry': 0, 'excited': 0, 'calm': 0, 'stressed': 0,
  };

  let totalIntensity = 0;
  const emotionCount = {};

  monthEntries.forEach(entry => {
    moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
    totalIntensity += entry.intensity;
    (entry.emotions || []).forEach(emotion => {
      emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
    });
  });

  const averageIntensity = monthEntries.length > 0 ? totalIntensity / monthEntries.length : 0;

  const topEmotions = Object.entries(emotionCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([emotion]) => emotion);

  return {
    monthStart: format(monthStart, 'yyyy-MM-dd'),
    monthEnd: format(monthEnd, 'yyyy-MM-dd'),
    moodDistribution,
    averageIntensity: Math.round(averageIntensity * 10) / 10,
    topEmotions,
    totalEntries: monthEntries.length,
  };
};

// Save thought entry (similar structure - thoughts collection)
export const saveThought = async (userId, date, thoughts, category) => {
  try {
    const thoughtId = `thought_${date}_${Date.now()}`;
    const thoughtRef = doc(collection(db, 'users', userId, 'thoughts'), thoughtId);

    await setDoc(thoughtRef, {
      id: thoughtId,
      userId,
      date,
      thoughts,
      category: category || 'neutral',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return thoughtId;
  } catch (error) {
    throw new Error('Failed to save thought');
  }
};

export const savePersonalityResult = async (userId, resultData) => {
  try {
    const resultId = `mbti_${Date.now()}`;
    const resultRef = doc(collection(db, 'users', userId, 'personalityResults'), resultId);

    await setDoc(resultRef, {
      id: resultId,
      type: resultData.type,
      E: resultData.E,
      I: resultData.I,
      S: resultData.S,
      N: resultData.N,
      T: resultData.T,
      F: resultData.F,
      J: resultData.J,
      P: resultData.P,
      completedAt: serverTimestamp(),
    });

    return resultId;
  } catch (error) {
    console.error('Failed to save personality result:', error);
    throw error;
  }
};

export const getPersonalityResults = async (userId) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'personalityResults'),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    return results;
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Get user thoughts (by date or all)
export const getUserThoughts = async (userId, date = null) => {
  try {
    const thoughtsCol = collection(db, 'users', userId, 'thoughts');
    let q = query(thoughtsCol, orderBy('createdAt', 'desc'));

    if (date) {
      q = query(q, where('date', '==', date));
    }

    const querySnapshot = await getDocs(q);
    const thoughts = [];
    querySnapshot.forEach(doc => {
      thoughts.push({ id: doc.id, ...doc.data() });
    });

    return thoughts;
  } catch (error) {
    throw new Error('Failed to get thoughts');
  }
};