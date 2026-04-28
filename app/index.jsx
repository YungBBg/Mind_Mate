import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { onAuthStateChangedListener } from '../services/firebaseAuth';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('Guest');

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
    if (user) {
      setIsAuthenticated(true);
      setUserName(user.displayName || user.email?.split('@')[0] || 'Guest');
    } else {
      setIsAuthenticated(false);
      setUserName('Guest');
    }
    setIsLoading(false);
  });

    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (isAuthenticated) {
    console.log('Index auth state changed - Real Firebase displayName:', user?.displayName || 'null'); //test log
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Welcome back, {userName}!
        </Text>
        <Redirect href="/(tabs)/home" />
      </View>
    );
  }

  return <Redirect href="/login" />;
}