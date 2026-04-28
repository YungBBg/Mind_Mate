import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator,
  Alert, ScrollView, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import { savePersonalityResult, getPersonalityResults } from '../../services/moodService';

export default function MBTIScreen() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const mbtiQuestions = [
    { id: 1, text: 'I am usually active and energetic at parties or social events.', dimension: 'E' },
    { id: 2, text: 'I prefer to think about problems alone.', dimension: 'I', reverse: true },
    { id: 3, text: 'I focus on practical and concrete facts.', dimension: 'S' },
    { id: 4, text: 'I like to imagine various possibilities.', dimension: 'N', reverse: true },
    { id: 5, text: 'I make decisions based mainly on logic and objective analysis.', dimension: 'T' },
    { id: 6, text: "I consider other people's feelings when making decisions.", dimension: 'F', reverse: true },
    { id: 7, text: 'I like to live a planned and organized life.', dimension: 'J' },
    { id: 8, text: 'I prefer to stay flexible and adapt as I go.', dimension: 'P', reverse: true },
    { id: 9, text: 'I find it easy to talk to strangers.', dimension: 'E' },
    { id: 10, text: 'I prefer deep discussions on a few topics.', dimension: 'I', reverse: true },
    { id: 11, text: 'I believe experience is more important than theory.', dimension: 'S' },
    { id: 12, text: 'I often have innovative ideas.', dimension: 'N' },
    { id: 13, text: 'I am direct when criticizing others.', dimension: 'T' },
    { id: 14, text: "I am easily moved by other people's stories.", dimension: 'F' },
    { id: 15, text: 'I like to keep things well organized.', dimension: 'J' },
    { id: 16, text: 'I hate being tied down by a schedule.', dimension: 'P', reverse: true },
    { id: 17, text: 'I feel comfortable in crowds.', dimension: 'E' },
    { id: 18, text: 'I need time alone to recharge my energy.', dimension: 'I', reverse: true },
    { id: 19, text: 'I pay attention to details and practical matters.', dimension: 'S' },
    { id: 20, text: 'I enjoy exploring abstract concepts.', dimension: 'N' },
    { id: 21, text: 'I make decisions decisively and objectively.', dimension: 'T' },
    { id: 22, text: "I care a lot about harmony and others' feelings.", dimension: 'F', reverse: true },
    { id: 23, text: 'I like to plan everything in advance.', dimension: 'J' },
    { id: 24, text: 'I like to live spontaneously.', dimension: 'P', reverse: true },
    { id: 25, text: 'I enjoy being the center of the group.', dimension: 'E' },
    { id: 26, text: 'I am quiet and introverted.', dimension: 'I', reverse: true },
    { id: 27, text: 'I trust facts and data.', dimension: 'S' },
    { id: 28, text: 'I am full of imagination about the future.', dimension: 'N' },
    { id: 29, text: 'I enjoy debating and analyzing.', dimension: 'T' },
    { id: 30, text: 'I easily empathize with others.', dimension: 'F' },
    { id: 31, text: 'I like to keep things in order.', dimension: 'J' },
    { id: 32, text: 'I like to improvise.', dimension: 'P', reverse: true },
    { id: 33, text: 'I make new friends easily.', dimension: 'E' },
    { id: 34, text: 'I need solitude to recharge.', dimension: 'I', reverse: true },
    { id: 35, text: 'I focus on practical and workable solutions.', dimension: 'S' },
    { id: 36, text: 'I like to innovate and break conventions.', dimension: 'N' },
    { id: 37, text: 'I make decisions rationally.', dimension: 'T' },
    { id: 38, text: 'I value relationships and harmony.', dimension: 'F', reverse: true },
    { id: 39, text: 'I like to arrange things according to a plan.', dimension: 'J' },
    { id: 40, text: 'I prefer to keep my options open.', dimension: 'P', reverse: true },
    { id: 41, text: 'I feel full of energy in social situations.', dimension: 'E' },
    { id: 42, text: 'I am quite shy and introverted.', dimension: 'I', reverse: true },
    { id: 43, text: 'I believe in proven facts.', dimension: 'S' },
    { id: 44, text: 'I have many creative ideas about the future.', dimension: 'N' },
    { id: 45, text: 'I like to speak my mind directly.', dimension: 'T' },
    { id: 46, text: 'I am easily touched emotionally.', dimension: 'F' },
    { id: 47, text: 'I like to make plans and follow them.', dimension: 'J' },
    { id: 48, text: 'I like to go with the flow.', dimension: 'P', reverse: true },
    { id: 49, text: 'I enjoy interacting with many people.', dimension: 'E' },
    { id: 50, text: 'I prefer a quiet environment.', dimension: 'I', reverse: true },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((currentUser) => {
      setUser(currentUser);
      if (currentUser?.uid) loadHistory(currentUser.uid);
      else setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadHistory = async (uid) => {
    try {
      const data = await getPersonalityResults(uid);
      setHistory(data || []);
      setLatestResult(data?.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Failed to load history:', error);
      setHistory([]);
      setLatestResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) await loadHistory(user.uid);
    setRefreshing(false);
  }, [user]);

  const progress = ((currentIndex + 1) / mbtiQuestions.length) * 100;
  const answerLabels = {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Neutral',
    4: 'Agree',
    5: 'Strongly Agree',
  };
  const answerTone = {
    1: 'Totally Not Me',
    2: 'Mostly Not Me',
    3: 'In Between',
    4: 'Pretty Much Me',
    5: 'Absolutely Me',
  };

  const renderHero = (title, subtitle, showProgress = false) => (
    <View style={styles.heroWrap}>
      <View style={styles.heroGlowA} />
      <View style={styles.heroGlowB} />
      <LinearGradient
        colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Mind Mate Exclusive</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        {showProgress && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const selectAnswer = (value) => {
    const current = mbtiQuestions[currentIndex];
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));

    if (currentIndex < mbtiQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateMBTIResult();
    }
  };

  const calculateMBTIResult = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setIsLoading(true);
    let E = 0, I = 0, S = 0, N = 0, T = 0, F = 0, J = 0, P = 0;

    Object.keys(answers).forEach((key) => {
      const id = parseInt(key, 10);
      const score = answers[id];
      const q = mbtiQuestions.find((item) => item.id === id);
      if (!q) return;
      const finalScore = q.reverse ? 6 - score : score;

      if (q.dimension === 'E') E += finalScore;
      else if (q.dimension === 'I') I += finalScore;
      else if (q.dimension === 'S') S += finalScore;
      else if (q.dimension === 'N') N += finalScore;
      else if (q.dimension === 'T') T += finalScore;
      else if (q.dimension === 'F') F += finalScore;
      else if (q.dimension === 'J') J += finalScore;
      else if (q.dimension === 'P') P += finalScore;
    });

    const type = (E > I ? 'E' : 'I') + (S > N ? 'S' : 'N') + (T > F ? 'T' : 'F') + (J > P ? 'J' : 'P');

    const finalResult = {
      type,
      E: Math.round((E / 25) * 100),
      I: Math.round((I / 25) * 100),
      S: Math.round((S / 25) * 100),
      N: Math.round((N / 25) * 100),
      T: Math.round((T / 25) * 100),
      F: Math.round((F / 25) * 100),
      J: Math.round((J / 25) * 100),
      P: Math.round((P / 25) * 100),
      completedAt: new Date().toISOString(),
    };

    try {
      await savePersonalityResult(user.uid, finalResult);
      setCurrentResult(finalResult);
      setLatestResult(finalResult);
      loadHistory(user.uid);
      Alert.alert('Success', `Your MBTI type is ${type}! Saved successfully.`);
    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Could not save to Firebase');
    } finally {
      setIsLoading(false);
      setIsTesting(false);
    }
  };

  const restartTest = () => {
    setCurrentIndex(0);
    setAnswers({});
    setCurrentResult(null);
    setIsTesting(true);
  };

  const confirmExit = () => {
    Alert.alert('Exit MBTI Test', 'Are you sure you want to exit? Your progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: () => {
          setIsTesting(false);
          setCurrentResult(null);
        },
      },
    ]);
  };

  const getMBTIDescription = (type) => {
    const descriptions = {
      INTJ: 'The Architect\n\nStrategic masterminds with a strong vision for the future. Independent, analytical, and highly competent. They excel at long-term planning and turning complex ideas into reality.\n\nStrengths: Strategic thinking, independence, high standards\nWeaknesses: May appear aloof or overly critical',
      INTP: 'The Logician\n\nInnovative thinkers who love exploring theories and complex systems. Logical, curious, and often ahead of their time.\n\nStrengths: Analytical mind, creativity, open-mindedness\nWeaknesses: May struggle with practical details',
      ENTJ: 'The Commander\n\nBold, confident leaders who excel at organizing people and resources to achieve ambitious goals.\n\nStrengths: Leadership, strategic vision, strong willpower\nWeaknesses: Can be overly dominant',
      ENTP: 'The Debater\n\nQuick-witted and inventive. They love challenging ideas and coming up with unconventional solutions.\n\nStrengths: Creativity, adaptability, charisma\nWeaknesses: May lose interest quickly',
      INFJ: 'The Advocate\n\nIdealistic and insightful visionaries with a deep desire to help others and improve the world.\n\nStrengths: Empathy, intuition, strong moral compass\nWeaknesses: Can be overly sensitive',
      INFP: 'The Mediator\n\nCreative, empathetic, and guided by strong personal values. They have a rich inner world.\n\nStrengths: Authenticity, creativity, empathy\nWeaknesses: May avoid practical matters',
      ENFJ: 'The Protagonist\n\nCharismatic leaders who care deeply about others growth and well-being.\n\nStrengths: Charisma, empathy, leadership\nWeaknesses: May neglect their own needs',
      ENFP: 'The Campaigner\n\nEnthusiastic, creative, and sociable free spirits who bring energy everywhere.\n\nStrengths: Enthusiasm, creativity, adaptability\nWeaknesses: May struggle with focus',
      ISTJ: 'The Logistician\n\nPractical, responsible, and dependable. They value order and reliability.\n\nStrengths: Responsibility, attention to detail, loyalty\nWeaknesses: May resist change',
      ISFJ: 'The Defender\n\nWarm, protective, and deeply committed to helping others.\n\nStrengths: Loyalty, empathy, practicality\nWeaknesses: May avoid conflict',
      ESTJ: 'The Executive\n\nOrganized, decisive leaders who value efficiency and tradition.\n\nStrengths: Organization, leadership, reliability\nWeaknesses: May be overly strict',
      ESFJ: 'The Consul\n\nCaring, sociable, and highly attuned to others needs.\n\nStrengths: Warmth, sociability, practicality\nWeaknesses: May struggle with criticism',
      ISTP: 'The Virtuoso\n\nPractical problem-solvers who love hands-on work.\n\nStrengths: Adaptability, technical skill, calm under pressure\nWeaknesses: May avoid long-term planning',
      ISFP: 'The Adventurer\n\nGentle, artistic, and in tune with their senses and values.\n\nStrengths: Creativity, empathy, flexibility\nWeaknesses: May avoid confrontation',
      ESTP: 'The Entrepreneur\n\nEnergetic and bold, love living in the moment.\n\nStrengths: Adaptability, courage, practicality\nWeaknesses: May get bored with routine',
      ESFP: 'The Entertainer\n\nOutgoing, spontaneous, and love bringing joy to others.\n\nStrengths: Enthusiasm, sociability, optimism\nWeaknesses: May avoid deep planning',
    };
    return descriptions[type] || 'This personality type possesses unique strengths and perspectives.';
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your MBTI records...</Text>
      </View>
    );
  }

  if (isTesting) {
    const currentQuestion = mbtiQuestions[currentIndex];
    return (
      <LinearGradient colors={['#0f1028', '#1f1b45', '#2a215f']} style={styles.pageGradient}>
        <SafeAreaView style={styles.container}>
          {renderHero('MBTI Night Mode', `Question ${currentIndex + 1} / ${mbtiQuestions.length}`, true)}
          <View style={styles.questionCard}>
            <Text style={styles.questionHint}>Pick the option that feels most like you</Text>
            <Text style={styles.questionText}>{currentQuestion?.text}</Text>
          </View>

          <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item: score }) => (
              <TouchableOpacity
                style={[styles.optionButton, answers[currentQuestion?.id] === score && styles.selectedOption]}
                onPress={() => selectAnswer(score)}
                activeOpacity={0.86}
              >
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>L{score}</Text>
                </View>
                <View>
                  <Text style={styles.optionText}>{answerLabels[score]}</Text>
                  <Text style={styles.optionSubText}>{answerTone[score]}</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.optionList}
          />

          <TouchableOpacity style={styles.exitTestButton} onPress={confirmExit}>
            <Text style={styles.exitButtonText}>Exit MBTI Test</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (currentResult) {
    return (
      <LinearGradient colors={['#0f1028', '#1f1b45', '#2a215f']} style={styles.pageGradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultType}>{currentResult.type}</Text>
            <Text style={styles.resultSubtitle}>Your Personality Type</Text>
          </View>

          <ScrollView style={styles.resultScroll}>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{getMBTIDescription(currentResult.type)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Dimension Breakdown</Text>
            <View style={styles.dimensionContainer}>
              {[
                { dim: 'E', color: '#ff9f43' },
                { dim: 'I', color: '#10ac84' },
                { dim: 'S', color: '#5f27cd' },
                { dim: 'N', color: '#00d2d3' },
                { dim: 'T', color: '#ff4757' },
                { dim: 'F', color: '#3742fa' },
                { dim: 'J', color: '#ffa502' },
                { dim: 'P', color: '#2ed573' },
              ].map(({ dim, color }) => {
                const value = currentResult[dim] || 0;
                return (
                  <View key={dim} style={styles.dimensionRow}>
                    <Text style={[styles.dimensionLabel, { color }]}>{dim}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.dimensionProgressFill, { width: `${value}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.dimensionValue, { color }]}>{value}%</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={restartTest}>
                <Text style={styles.buttonText}>Take the Test Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitButton} onPress={() => setCurrentResult(null)}>
                <Text style={styles.exitButtonText}>Back to Main</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f1028', '#1f1b45', '#2a215f']} style={styles.pageGradient}>
      <SafeAreaView style={styles.container}>
        {renderHero('My MBTI Vibe', 'Discover your personality magic')}

        <FlatList
          data={history}
          keyExtractor={(item) => item.id || String(item.completedAt)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />}
          ListHeaderComponent={() => (
            <>
              {latestResult && (
                <View style={styles.latestCard}>
                  <Text style={styles.latestTitle}>Your latest personality spark</Text>
                  <Text style={styles.latestType}>{latestResult.type}</Text>
                  <Text style={styles.latestDate}>{formatDate(latestResult.completedAt)}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.startButton} onPress={restartTest} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#7f5af0', '#2cb67d', '#00d4ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {latestResult ? 'Retake The MBTI Quest' : 'Start Your MBTI Quest'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {history.length > 0 && <Text style={styles.historyTitle}>Test History</Text>}
            </>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyRow} onPress={() => setCurrentResult(item)}>
              <Text style={styles.historyDate}>{formatDate(item.completedAt)}</Text>
              <Text style={styles.historyType}>{item.type}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No MBTI test yet.{'\n'}Start your journey now!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const formatDate = (dateValue) => {
  if (!dateValue) return 'Unknown date';
  try {
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return format(date, 'yyyy-MM-dd HH:mm');
  } catch (e) {
    return 'Invalid date';
  }
};

const styles = StyleSheet.create({
  pageGradient: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  heroWrap: { marginHorizontal: 16, marginTop: 10, marginBottom: 14, position: 'relative' },
  heroGlowA: { position: 'absolute', right: -8, top: -10, width: 94, height: 94, borderRadius: 999, backgroundColor: 'rgba(44,182,125,0.35)' },
  heroGlowB: { position: 'absolute', left: -10, bottom: -10, width: 80, height: 80, borderRadius: 999, backgroundColor: 'rgba(0,212,255,0.25)' },
  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroEyebrow: { color: '#9de4ff', fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 29, fontWeight: '800', color: '#ffffff', marginTop: 6 },
  heroSubtitle: { color: 'rgba(232,238,255,0.9)', marginTop: 6, fontSize: 14, letterSpacing: 0.25 },
  progressTrack: { marginTop: 16, height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#38f2b6', borderRadius: 999 },

  latestCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#2f2a6d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  latestTitle: { fontSize: 15, color: '#646487', marginBottom: 8 },
  latestType: { fontSize: 44, fontWeight: '800', color: '#2a215f', letterSpacing: 1.4 },
  latestDate: { fontSize: 13, color: '#8f8faf', marginTop: 10 },
  historyTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 20, marginTop: 10, color: '#ebecff' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#141436',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  historyDate: { fontSize: 14, color: '#5f5f7e' },
  historyType: { fontSize: 18, fontWeight: '700', color: '#3e2cbf' },

  startButton: {
    borderRadius: 999,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 4,
  },
  startButtonGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 999 },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },

  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#0c0e29',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  questionHint: { fontSize: 12, textAlign: 'center', color: '#65658b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  questionText: { fontSize: 21, lineHeight: 30, textAlign: 'center', color: '#2d2d44', fontWeight: '600' },
  optionList: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#dddff3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  selectedOption: { borderColor: '#2cb67d', backgroundColor: '#ecfff7' },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eceafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionBadgeText: { color: '#5f55de', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  optionText: { fontSize: 16, color: '#3c3c59', fontWeight: '700' },
  optionSubText: { fontSize: 12, color: '#8b8bac', marginTop: 2, fontWeight: '500' },
  exitTestButton: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#ff4757',
    alignItems: 'center',
  },

  resultHeader: { paddingTop: 45, paddingBottom: 15, alignItems: 'center', backgroundColor: '#0f1028' },
  resultType: { fontSize: 48, fontWeight: '800', color: '#fff' },
  resultSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  resultScroll: { flex: 1, padding: 16 },
  descriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  description: { fontSize: 16.5, lineHeight: 26, color: '#ddd' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12, marginLeft: 4 },
  dimensionContainer: { marginBottom: 24 },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dimensionLabel: { width: 28, fontWeight: '700', fontSize: 17 },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    marginHorizontal: 12,
  },
  dimensionProgressFill: { height: '100%', borderRadius: 999 },
  dimensionValue: { width: 48, textAlign: 'right', fontWeight: '600', fontSize: 15.5 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  actionButton: { flex: 1, backgroundColor: '#667eea', padding: 16, borderRadius: 30, alignItems: 'center' },
  exitButton: { flex: 1, backgroundColor: '#ff4757', padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  exitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  listContent: { paddingBottom: 32 },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#d2d6ff', textAlign: 'center' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#646487', fontSize: 16, fontWeight: '500' },
});
