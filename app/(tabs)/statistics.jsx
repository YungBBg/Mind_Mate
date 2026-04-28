import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { onAuthStateChangedListener } from '../../services/firebaseAuth';
import { getWeeklyStats, getMonthlyStats } from '../../services/moodService';
import { recomputeAndSaveAchievements } from '../../services/achievementService';
import { format, startOfWeek, endOfWeek, startOfMonth, subMonths, addMonths, subWeeks, addWeeks } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryPie } from 'victory-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;

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

export default function StatisticsScreen() {
  const [user, setUser] = useState(null);

  const [viewMode, setViewMode] = useState('week');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const loadStats = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (viewMode === 'week') {
        const stats = await getWeeklyStats(user.uid, currentWeek);
        setWeeklyStats(stats);
      } else {
        const stats = await getMonthlyStats(user.uid, currentMonth);
        setMonthlyStats(stats);
      }
      const userAchievements = await recomputeAndSaveAchievements(user.uid);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, viewMode, currentWeek, currentMonth]);

  // Load statistics when user or view mode changes
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, viewMode, currentWeek, currentMonth, loadStats]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadStats();
      }
    }, [user, loadStats])
  );

  const navigatePeriod = (direction) => {
    if (viewMode === 'week') {
      setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else {
      setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    }
  };

  const getPeriodText = () => {
    if (viewMode === 'week') {
      const start = format(currentWeek, 'MMM dd');
      const end = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd');
      return `${start} - ${end}`;
    } else {
      return format(currentMonth, 'MMMM yyyy');
    }
  };

  const stats = viewMode === 'week' ? weeklyStats : monthlyStats;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);
  const hasStatsForView = stats != null;
  const showLoader = !hasStatsForView && isLoading;
  const showCharts = hasStatsForView && !isLoading && stats.totalEntries > 0;

  const moodData = showCharts
    ? Object.entries(stats.moodDistribution)
        .filter(([, value]) => value > 0)
        .map(([mood, count]) => ({
          x: mood,
          y: count,
          fill: MOOD_COLORS[mood] || '#ddd',
        }))
    : [];

  const emotionData = showCharts
    ? stats.topEmotions.map((emotion, index) => ({
        x: emotion,
        y: 1,
        label: emotion,
        fill: ['#667eea', '#764ba2', '#90ee7e', '#f45b5b', '#2b908f'][index % 5],
      }))
    : [];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mood Statistics</Text>
        <Text style={styles.headerSubtitle}>Analyze your emotional patterns</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'month' && styles.toggleButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.periodNavigation}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigatePeriod('prev')}>
            <Ionicons name="chevron-back" size={24} color="#667eea" />
          </TouchableOpacity>
          <View style={styles.periodLabel}>
            <Text style={styles.periodText}>{getPeriodText()}</Text>
          </View>
          <TouchableOpacity style={styles.navButton} onPress={() => navigatePeriod('next')}>
            <Ionicons name="chevron-forward" size={24} color="#667eea" />
          </TouchableOpacity>
        </View>

        {showLoader ? (
          <View style={styles.contentLoader}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        ) : !hasStatsForView ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Unable to load statistics</Text>
            <Text style={styles.emptySubtext}>Pull to refresh or try again later</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.contentLoader}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        ) : stats.totalEntries === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No data for this period</Text>
            <Text style={styles.emptySubtext}>Use the arrows to pick another week or month, or record moods for this range</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalEntries}</Text>
                  <Text style={styles.statLabel}>Total Entries</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.averageIntensity.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Avg Intensity</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.topEmotions.length}</Text>
                  <Text style={styles.statLabel}>Top Emotions</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Achievements</Text>
              <Text style={styles.achievementSummary}>
                {unlockedAchievements.length}/{achievements.length || 6} unlocked
              </Text>
              <View style={styles.achievementList}>
                {(achievements.length > 0 ? achievements : []).map((achievement) => (
                  <View
                    key={achievement.id}
                    style={[
                      styles.achievementItem,
                      achievement.unlocked
                        ? styles.achievementItemUnlocked
                        : styles.achievementItemLocked,
                    ]}
                  >
                    <Ionicons
                      name={achievement.icon || 'ribbon-outline'}
                      size={18}
                      color={achievement.unlocked ? '#4caf50' : '#bdbdbd'}
                    />
                    <View style={styles.achievementTextWrap}>
                      <Text
                        style={[
                          styles.achievementTitle,
                          !achievement.unlocked && styles.achievementTitleLocked,
                        ]}
                      >
                        {achievement.title}
                      </Text>
                      <Text style={styles.achievementDescription}>
                        {achievement.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Mood Distribution</Text>
              <VictoryChart
                width={CHART_WIDTH}
                height={220}
                theme={VictoryTheme.material}
              >
                <VictoryBar
                  data={moodData}
                  x="x"
                  y="y"
                  style={{
                    data: { fill: ({ datum }) => datum.fill }
                  }}
                  barRatio={0.8}
                  cornerRadius={4}
                  horizontal
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    tickLabels: { fontSize: 10, padding: 5 }
                  }}
                />
                <VictoryAxis
                  style={{
                    tickLabels: { fontSize: 10, padding: 5 }
                  }}
                />
              </VictoryChart>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top Emotions</Text>
              <VictoryPie
                data={emotionData}
                colorScale={emotionData.map(d => d.fill)}
                width={CHART_WIDTH}
                height={250}
                innerRadius={70}
                labelRadius={100}
                style={{
                  labels: { fontSize: 12, fill: '#333' }
                }}
              />
            </View>
          </>
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
  contentLoader: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#667eea',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navButton: {
    padding: 8,
  },
  periodLabel: {
    flex: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsCard: {
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
  statsCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  achievementSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  achievementList: {
    gap: 10,
  },
  achievementItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementItemUnlocked: {
    borderColor: '#b6efbe',
    backgroundColor: '#f4fff5',
  },
  achievementItemLocked: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  achievementTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#9e9e9e',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#666',
  },
  emotionsList: {
    marginTop: 10,
  },
  emotionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emotionRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    width: 30,
  },
  emotionText: {
    fontSize: 16,
    color: '#333',
    textTransform: 'capitalize',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 20,
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
  },
});