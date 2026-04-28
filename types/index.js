// Type definitions for Mind Mate app (JavaScript version)
// This file exports type information as JSDoc comments for IDE support

// Note: In JavaScript, types are not enforced at runtime.
// These are just documentation comments for better IDE support.

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} email
 * @property {string} [displayName]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} MoodEntry
 * @property {string} id
 * @property {string} userId
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {MoodType} mood
 * @property {EmotionType[]} emotions
 * @property {number} intensity - 1-10 scale
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {'very-happy' | 'happy' | 'neutral' | 'sad' | 'very-sad' | 'anxious' | 'angry' | 'excited' | 'calm' | 'stressed'} MoodType
 */

/**
 * @typedef {'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'love' | 'anxiety' | 'calm' | 'excitement' | 'stress' | 'hope' | 'gratitude' | 'loneliness' | 'confidence'} EmotionType
 */

/**
 * @typedef {Object} MoodStats
 * @property {string} date
 * @property {MoodType} mood
 * @property {EmotionType[]} emotions
 * @property {number} intensity
 */

/**
 * @typedef {Object} WeeklyStats
 * @property {string} weekStart
 * @property {string} weekEnd
 * @property {Record<MoodType, number>} moodDistribution
 * @property {number} averageIntensity
 * @property {EmotionType[]} topEmotions
 */

/**
 * @typedef {Object} MonthlyStats
 * @property {string} month - YYYY-MM
 * @property {Record<MoodType, number>} moodDistribution
 * @property {number} averageIntensity
 * @property {EmotionType[]} topEmotions
 * @property {number} totalEntries
 */

/**
 * @typedef {Object} ThoughtEntry
 * @property {string} id
 * @property {string} userId
 * @property {string} date
 * @property {string} thoughts
 * @property {'positive' | 'negative' | 'neutral'} [category]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

// Export constants for mood and emotion types (for runtime use)
export const MoodTypes = {
  VERY_HAPPY: 'very-happy',
  HAPPY: 'happy',
  NEUTRAL: 'neutral',
  SAD: 'sad',
  VERY_SAD: 'very-sad',
  ANXIOUS: 'anxious',
  ANGRY: 'angry',
  EXCITED: 'excited',
  CALM: 'calm',
  STRESSED: 'stressed',
};

export const EmotionTypes = {
  JOY: 'joy',
  SADNESS: 'sadness',
  ANGER: 'anger',
  FEAR: 'fear',
  SURPRISE: 'surprise',
  DISGUST: 'disgust',
  LOVE: 'love',
  ANXIETY: 'anxiety',
  CALM: 'calm',
  EXCITEMENT: 'excitement',
  STRESS: 'stress',
  HOPE: 'hope',
  GRATITUDE: 'gratitude',
  LONELINESS: 'loneliness',
  CONFIDENCE: 'confidence',
};
