import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: '#667eea',
        drawerInactiveTintColor: '#999',
        drawerStyle: {
          width: 260,
        },
      }}
    >
      <Drawer.Screen
        name="home"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="mood-entry"
        options={{
          title: 'Record Mood',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="statistics"
        options={{
          title: 'Statistics',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="thoughts"
        options={{
          title: 'Thoughts',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="aiTalk"
        options={{
          title: 'AI Talk',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="happy-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="aiChat"
        options={{
          title: 'AI Chat',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="mbti"
        options={{
          title: 'MBTI',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}