import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import MQTTService from '../services/MQTTService';
import NotificationService from '../services/NotificationService';

const AUTH_KEY = 'user_auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsBiometricAuth, setNeedsBiometricAuth] = useState(false);
  const appState = useRef(AppState.currentState);
  const wasInBackground = useRef(false);

  useEffect(() => {
    checkAuthStatus();

    MQTTService.setErrorCallback(async (error, title) => {
      await NotificationService.sendMQTTNotification(false, error);
    });

    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background') {
        wasInBackground.current = true;
      }

      else if (nextAppState === 'active' && wasInBackground.current) {
        try {
          const currentAuth = await AsyncStorage.getItem(AUTH_KEY);
          const biometricEnabled = await AuthService.isBiometricEnabled();
          const biometricAvailable = await AuthService.isBiometricAvailable();

          if (currentAuth === 'true' && biometricEnabled && biometricAvailable.available) {
            setIsAuthenticated(false);
            setNeedsBiometricAuth(true);
          }

          await attemptMQTTReconnection();
        } catch (error) {
          // Silent fail
        }

        wasInBackground.current = false;
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const attemptMQTTReconnection = async () => {
    try {
      if (MQTTService.isConnected) {
        return;
      }

      const configLoaded = await MQTTService.loadSavedConfig();
      if (configLoaded) {
        await MQTTService.reconnect();
      }
    } catch (error) {
      // Silent fail
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      const hasCredentials = await AuthService.getStoredCredentials();

      if (!hasCredentials) {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
        return;
      }

      const biometricEnabled = await AuthService.isBiometricEnabled();
      const biometricAvailable = await AuthService.isBiometricAvailable();

      if (biometricEnabled && biometricAvailable.available) {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(true);
      } else {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setNeedsBiometricAuth(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    setIsAuthenticated(true);
    setNeedsBiometricAuth(false);
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setNeedsBiometricAuth(false);
    } catch (error) {
      // Silent fail
    }
  };

  const lockApp = async () => {
    try {
      const biometricEnabled = await AuthService.isBiometricEnabled();
      const biometricAvailable = await AuthService.isBiometricAvailable();

      if (biometricEnabled && biometricAvailable.available) {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(true);
      } else {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setNeedsBiometricAuth(false);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    needsBiometricAuth,
    login,
    logout,
    lockApp,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
