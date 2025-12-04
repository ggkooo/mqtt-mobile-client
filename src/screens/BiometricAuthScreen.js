import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import { useAuth } from '../context/AuthContext';

const BiometricAuthScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadBiometricTypes();
    // Reactivated: automatic biometric call for better UX
    setTimeout(() => {
      handleBiometricAuth();
    }, 800); // Small delay to ensure screen was loaded
  }, []);

  const loadBiometricTypes = async () => {
    try {
      const types = await AuthService.getAvailableAuthenticationTypes();
      setBiometricTypes(types);
    } catch (error) {
      // Silent failure - not critical for functionality
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setLoading(true);
      const result = await AuthService.authenticateWithBiometrics();

      if (result.success) {
        login();
      } else {
        // Check if it's system or user cancellation
        if (result.error && (
          result.error.includes('system_cancel') ||
          result.error.includes('user_cancel') ||
          result.error.includes('cancelada') ||
          result.error.includes('cancelled')
        )) {
          // Do nothing - let user try again manually
          return;
        }

        // For other types of errors, increment counter and handle
        setRetryCount(prev => prev + 1);
        if (retryCount >= 2) {
          // After 3 attempts, offer password login
          Alert.alert(
            'Authentication Error',
            'Would you like to try again?',
            [
              { text: 'Yes', onPress: () => setRetryCount(0) },
              { text: 'Cancel', onPress: handleLoginWithPassword }
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = () => {
    navigation.replace('Login');
  };

  const getBiometricIcon = () => {
    if (biometricTypes.some(type => type.includes('Face'))) {
      return 'scan';
    }
    return 'finger-print';
  };

  const getBiometricText = () => {
    if (biometricTypes.some(type => type.includes('Face'))) {
      return 'FaceID';
    }
    return 'TouchID';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>GGKO's House</Text>
        </View>

        {/* Ícone biométrico */}
        <View style={styles.biometricContainer}>
          <View style={styles.biometricIconContainer}>
            <Ionicons
              name={getBiometricIcon()}
              size={80}
              color="#8E8E93"
            />
          </View>

          <Text style={styles.biometricTitle}>
            {getBiometricText()}
          </Text>
        </View>

        {/* Botões de ação */}
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            onPress={handleBiometricAuth}
            loading={loading}
            disabled={loading}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonText}
          >
            Authenticate
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 30,
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
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  biometricContainer: {
    alignItems: 'center',
    marginBottom: 80,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  biometricIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  biometricTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 0,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: '#8E8E93',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default BiometricAuthScreen;
