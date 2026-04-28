import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../services/firebaseAuth';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <LottieView
              source={require('../assets/MultiLeaf.json')}
              autoPlay
              loop
              style={styles.multiLeaf}
            />

            <View style={styles.titleBlock}>
              <Text style={styles.title}>Mind Mate</Text>
              <Text style={styles.subtitle}>Your personal mood companion</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.linkText}>
                  Don't have an account? Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View pointerEvents="none" style={styles.welcomeOverlay}>
          <LottieView
            source={require('../assets/Welcome.json')}
            autoPlay
            loop
            style={styles.welcomeAnim}
          />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  multiLeaf: {
    position: 'absolute',
    top: -94,
    left: -16,
    width: 170,
    height: 170,
    opacity: 0.38,
  },
  titleBlock: {
    alignItems: 'center',
    transform: [{ translateY: -64 }],
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  welcomeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeAnim: {
    width: 220,
    height: 160,
    opacity: 0.8,
  },
});
