import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Switch } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthService from '../services/AuthService';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricPreference();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const biometricCheck = await AuthService.isBiometricAvailable();
      setBiometricAvailable(biometricCheck.available);
    } catch (error) {
      // Falha silenciosa
    }
  };

  const loadBiometricPreference = async () => {
    try {
      const enabled = await AuthService.isBiometricEnabled();
      setBiometricEnabled(enabled);
    } catch (error) {
      // Falha silenciosa
    }
  };

  const handleBiometricToggle = async (value) => {
    setBiometricEnabled(value);
    try {
      await AuthService.setBiometricEnabled(value);
    } catch (error) {
      // Falha silenciosa, reverter estado
      setBiometricEnabled(!value);
    }
  };



  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const result = await AuthService.loginWithCredentials(username.trim(), password);

      if (result.success) {
        // Configure biometrics based on current switch status
        if (biometricAvailable && biometricEnabled) {
          try {
            await AuthService.setBiometricEnabled(true);
          } catch (error) {
            // Silent fail
          }
        }

        // Silent login
        login();
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Try again');
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>GGKO's House</Text>
          </View>

          {/* Formulário */}
          <View style={styles.formContainer}>
            <TextInput
              label="Email"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              disabled={loading}
              theme={{
                colors: {
                  primary: '#8E8E93',
                  outline: '#E5E5EA',
                  background: '#fff',
                  onSurfaceVariant: '#666',
                }
              }}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              style={styles.input}
              disabled={loading}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? "eye-off" : "eye"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
              theme={{
                colors: {
                  primary: '#8E8E93',
                  outline: '#E5E5EA',
                  background: '#fff',
                  onSurfaceVariant: '#666',
                }
              }}
            />

            {/* Biometry Switch */}
            {biometricAvailable && (
              <View style={styles.biometricContainer}>
                <View style={styles.biometricTextContainer}>
                  <Text style={styles.biometricLabel}>
                    Use biometry for future logins
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={loading}
                  trackColor={{ false: '#E5E5EA', true: '#8E8E93' }}
                  thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
            )}

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonText}
              buttonColor="#8E8E93"
            >
              Login
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  biometricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LoginScreen;
