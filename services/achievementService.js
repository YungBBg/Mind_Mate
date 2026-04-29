import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { differenceInCalendarDays, isValid, parse, parseISO } from 'date-fns';

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first-checkin',
    title: 'First Check-in',
    description: 'Record your first mood entry.',
    icon: 'sparkles-outline',
    condition: ({ totalEntries }) => totalEntries >= 1,
  },
  {
    id: '3-day-streak',
    title: '3-Day Streak',
    description: 'Record moods for 3 consecutive days.',
    icon: 'flame-outline',
    condition: ({ longestStreak }) => longestStreak >= 3,
  },
  {
    id: '7-day-streak',
    title: '7-Day Streak',
    description: 'Record moods for 7 consecutive days.',
    icon: 'trophy-outline',
    condition: ({ longestStreak }) => longestStreak >= 7,
  },
  {
    id: 'mood-explorer',
    title: 'Mood Explorer',
    description: 'Use 5 different mood types.',
    icon: 'planet-outline',
    condition: ({ uniqueMoodCount }) => uniqueMoodCount >= 5,
  },
  {
    id: 'emotion-collector',
    title: 'Emotion Collector',
    description: 'Select 10 different emotions.',
    icon: 'albums-outline',
    condition: ({ uniqueEmotionCount }) => uniqueEmotionCount >= 10,
  },
  {
    id: 'reflection-writer',
    title: 'Reflection Writer',
    description: 'Write notes on 5 mood entries.',
    icon: 'create-outline',
    condition: ({ notesCount }) => notesCount >= 5,
  },
];

const getMoodEntriesCollection = (userId) => collection(db, 'users', userId, 'moodEntries');
const getAchievementMetaRef = (userId) => doc(db, 'users', userId, 'meta', 'achievements');

const parseEntryDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const isoDate = parseISO(dateStr);
  if (isValid(isoDate)) return isoDate;

  const patterns = ['d/M/yy', 'd/M/yyyy', 'dd/MM/yy', 'dd/MM/yyyy'];
  for (const pattern of patterns) {
    const parsed = parse(dateStr, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }

  return null;
};

const getUniqueSortedDates = (entries) => {
  const uniqueDates = new Set(entries.map((entry) => entry.date).filter(Boolean));
  return Array.from(uniqueDates)
    .map((dateStr) => parseEntryDate(dateStr))
    .filter(Boolean)
    .sort((a, b) => a - b);
};

const calculateLongestStreak = (entries) => {
  const dates = getUniqueSortedDates(entries);
  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i += 1) {
    const dayDiff = differenceInCalendarDays(dates[i], dates[i - 1]);
    if (dayDiff === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
};

const buildAchievementContext = (entries) => {
  const moodSet = new Set();
  const emotionSet = new Set();
  let notesCount = 0;

  entries.forEach((entry) => {
    if (entry.mood) {
      moodSet.add(entry.mood);
    }

    (entry.emotions || []).forEach((emotion) => emotionSet.add(emotion));

    if ((entry.notes || '').trim().length > 0) {
      notesCount += 1;
    }
  });

  return {
    totalEntries: entries.length,
    uniqueMoodCount: moodSet.size,
    uniqueEmotionCount: emotionSet.size,
    notesCount,
    longestStreak: calculateLongestStreak(entries),
  };
};

const evaluateAchievements = (entries, previousAchievements = []) => {
  const context = buildAchievementContext(entries);
  const previousMap = previousAchievements.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const unlockedNow = definition.condition(context);

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      unlocked: unlockedNow,
      unlockedAt: unlockedNow
        ? previousMap[definition.id]?.unlockedAt || new Date().toISOString()
        : null,
    };
  });
};

export const getAchievements = async (userId) => {
  const metaRef = getAchievementMetaRef(userId);
  const snapshot = await getDoc(metaRef);
  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  return data.achievements || [];
};

export const recomputeAndSaveAchievements = async (userId) => {
  const moodQuery = query(getMoodEntriesCollection(userId), orderBy('date', 'desc'));
  const moodSnapshot = await getDocs(moodQuery);
  const entries = [];
  moodSnapshot.forEach((entryDoc) => {
    entries.push({ id: entryDoc.id, ...entryDoc.data() });
  });

  const existingAchievements = await getAchievements(userId);
  const achievements = evaluateAchievements(entries, existingAchievements);

  await setDoc(
    getAchievementMetaRef(userId),
    {
      achievements,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return achievements;
};
