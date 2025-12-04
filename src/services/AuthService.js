import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_KEY } from '@env';

const AUTH_KEY = 'user_auth';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const USER_CREDENTIALS_KEY = 'user_credentials';

class AuthService {
  constructor() {
    this.isAuthenticated = false;
  }

  async tryAutoAuthenticate() {
    try {
      const hasCredentials = await this.getStoredCredentials();
      if (!hasCredentials) {
        return { success: false, needsLogin: true };
      }

      const biometricEnabled = await this.isBiometricEnabled();
      if (!biometricEnabled) {
        return { success: false, needsLogin: true };
      }

      const biometricCheck = await this.isBiometricAvailable();
      if (!biometricCheck.available) {
        return { success: false, needsLogin: true };
      }

      const authResult = await this.authenticateWithBiometrics();
      if (authResult.success) {
        return { success: true, needsLogin: false };
      } else {
        return { success: false, needsLogin: true, error: authResult.error };
      }
    } catch (error) {
      return { success: false, needsLogin: true, error: error.message };
    }
  }

  async isBiometricAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        available: hasHardware && isEnrolled,
        types: supportedTypes,
        hasHardware,
        isEnrolled
      };
    } catch (error) {
      return { available: false, types: [], hasHardware: false, isEnrolled: false };
    }
  }

  async getAvailableAuthenticationTypes() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Touch ID / Impressão Digital';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID / Reconhecimento Facial';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Íris';
          default:
            return 'Biometria';
        }
      });
    } catch (error) {
      return [];
    }
  }

  async authenticateWithBiometrics() {
    try {
      const biometricCheck = await this.isBiometricAvailable();

      if (!biometricCheck.available) {
        throw new Error('Autenticação biométrica não disponível');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o app',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      if (result.success) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');

        return { success: true, warning: result.warning };
      } else {
        let errorMessage = 'Autenticação cancelada';
        if (result.error) {
          errorMessage = result.error;
        }

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async authenticateWithAPI(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': API_KEY,
        },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        return { success: true, userData: userData };
      } else {
        return { success: false, error: 'Email ou senha inválidos' };
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão com o servidor. Verifique sua internet.' };
    }
  }

  async loginWithCredentials(username, password) {
    try {
      const apiResult = await this.authenticateWithAPI(username, password);

      if (apiResult.success) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');

        const storedCredentials = await this.getStoredCredentials();
        const isFirstTime = !storedCredentials;

        await this.saveCredentials(username, password);

        return {
          success: true,
          method: 'api',
          userData: apiResult.userData,
          firstTime: isFirstTime
        };
      }

      const storedCredentials = await this.getStoredCredentials();

      if (storedCredentials &&
          storedCredentials.username === username &&
          storedCredentials.password === password) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        return { success: true, method: 'stored' };
      }

      return {
        success: false,
        error: 'Credenciais inválidas. Verifique seu email e senha.'
      };
    } catch (error) {
      return { success: false, error: 'Erro interno durante o login. Tente novamente.' };
    }
  }

  async checkAPIConnectivity() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': API_KEY,
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'test'
        }),
      });

      const isConnected = response.status >= 200 && response.status < 500;
      return isConnected;
    } catch (error) {
      return false;
    }
  }

  async saveCredentials(username, password) {
    try {
      const credentials = { username, password };
      await SecureStore.setItemAsync(USER_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      throw error;
    }
  }

  async getStoredCredentials() {
    try {
      const credentialsJson = await SecureStore.getItemAsync(USER_CREDENTIALS_KEY);
      return credentialsJson ? JSON.parse(credentialsJson) : null;
    } catch (error) {
      return null;
    }
  }

  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      throw error;
    }
  }

  async isUserAuthenticated() {
    try {
      const auth = await AsyncStorage.getItem(AUTH_KEY);
      const hasCredentials = await this.getStoredCredentials();

      this.isAuthenticated = auth === 'true';
      return this.isAuthenticated && hasCredentials;
    } catch (error) {
      return false;
    }
  }

  async logout() {
    try {
      this.isAuthenticated = false;
      await AsyncStorage.removeItem(AUTH_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
    } catch (error) {
      throw error;
    }
  }

  async clearUserData() {
    try {
      await AsyncStorage.multiRemove([AUTH_KEY, BIOMETRIC_ENABLED_KEY]);

      try {
        await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
      } catch (error) {
        // Silent fail
      }

      this.isAuthenticated = false;
    } catch (error) {
      throw error;
    }
  }

  async testLogoutStatus() {
    try {
      const authStatus = await AsyncStorage.getItem(AUTH_KEY);
      const biometricStatus = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const credentials = await this.getStoredCredentials();

      return {
        success: true,
        authCleared: authStatus === null,
        biometricCleared: biometricStatus === null,
        credentialsCleared: credentials === null,
        internalState: this.isAuthenticated
      };
    } catch (error) {
      return { success: false, error: 'Erro ao testar estado' };
    }
  }
}

export default new AuthService();
