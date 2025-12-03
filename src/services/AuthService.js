import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'user_auth';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const USER_CREDENTIALS_KEY = 'user_credentials';

class AuthService {
  constructor() {
    this.isAuthenticated = false;
  }

  // Tenta autenticação automática com biometria na inicialização
  async tryAutoAuthenticate() {
    try {
      // Verifica se o usuário já fez login pelo menos uma vez
      const hasCredentials = await this.getStoredCredentials();
      if (!hasCredentials) {
        return { success: false, needsLogin: true };
      }

      // Verifica se biometria está habilitada
      const biometricEnabled = await this.isBiometricEnabled();
      if (!biometricEnabled) {
        return { success: false, needsLogin: true };
      }

      // Verifica se biometria está disponível
      const biometricCheck = await this.isBiometricAvailable();
      if (!biometricCheck.available) {
        return { success: false, needsLogin: true };
      }

      // Tenta autenticar com biometria
      const authResult = await this.authenticateWithBiometrics();
      if (authResult.success) {
        return { success: true, needsLogin: false };
      } else {
        return { success: false, needsLogin: true, error: authResult.error };
      }
    } catch (error) {
      console.error('Erro na autenticação automática:', error);
      return { success: false, needsLogin: true, error: error.message };
    }
  }

  // Verifica se o dispositivo suporta autenticação biométrica
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
      console.error('Erro ao verificar biometria:', error);
      return { available: false, types: [], hasHardware: false, isEnrolled: false };
    }
  }

  // Obtém os tipos de autenticação disponíveis
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
      console.error('Erro ao obter tipos de autenticação:', error);
      return [];
    }
  }

  // Autentica com biometria
  async authenticateWithBiometrics() {
    try {
      const biometricCheck = await this.isBiometricAvailable();

      if (!biometricCheck.available) {
        throw new Error('Autenticação biométrica não disponível');
      }

      console.log('Iniciando autenticação biométrica...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o app',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      console.log('Resultado da autenticação biométrica:', JSON.stringify(result, null, 2));

      if (result.success) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        console.log('Autenticação biométrica bem-sucedida');
        return { success: true };
      } else {
        // Tratamento específico para diferentes tipos de erro
        let errorMessage = 'Autenticação cancelada';
        if (result.error) {
          errorMessage = result.error;
        } else if (result.warning) {
          errorMessage = result.warning;
        }

        console.log('Falha na autenticação biométrica:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return { success: false, error: error.message };
    }
  }

  // Login com usuário e senha
  async loginWithCredentials(username, password) {
    try {
      // Credenciais padrão do sistema
      const DEFAULT_USERNAME = 'admin';
      const DEFAULT_PASSWORD = '1234';

      // Verificar se são as credenciais padrão
      if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
        console.log('Login com credenciais padrão realizado');
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');

        // Verificar se já tem credenciais salvas
        const storedCredentials = await this.getStoredCredentials();
        const isFirstTime = !storedCredentials;

        // Salvar credenciais padrão
        await this.saveCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD);

        return { success: true, firstTime: isFirstTime };
      }

      // Verificar credenciais armazenadas (para compatibilidade futura)
      const storedCredentials = await this.getStoredCredentials();

      if (storedCredentials &&
          storedCredentials.username === username &&
          storedCredentials.password === password) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        return { success: true };
      } else if (!storedCredentials) {
        // Primeira vez fazendo login com credenciais personalizadas
        await this.saveCredentials(username, password);
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        return { success: true, firstTime: true };
      } else {
        return { success: false, error: 'Credenciais inválidas' };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: error.message };
    }
  }

  // Salva credenciais de forma segura
  async saveCredentials(username, password) {
    try {
      const credentials = { username, password };
      await SecureStore.setItemAsync(USER_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      throw error;
    }
  }

  // Obtém credenciais armazenadas
  async getStoredCredentials() {
    try {
      const credentialsJson = await SecureStore.getItemAsync(USER_CREDENTIALS_KEY);
      return credentialsJson ? JSON.parse(credentialsJson) : null;
    } catch (error) {
      console.error('Erro ao obter credenciais:', error);
      return null;
    }
  }

  // Verifica se biometria está habilitada
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Erro ao verificar biometria:', error);
      return false;
    }
  }

  // Habilita ou desabilita biometria
  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Erro ao definir biometria:', error);
      throw error;
    }
  }

  // Verifica se o usuário está autenticado
  async isUserAuthenticated() {
    try {
      const auth = await AsyncStorage.getItem(AUTH_KEY);
      const hasCredentials = await this.getStoredCredentials();

      this.isAuthenticated = auth === 'true';
      return this.isAuthenticated && hasCredentials;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  // Logout
  async logout() {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  // Remove todas as credenciais (reset completo)
  async clearAllData() {
    try {
      console.log('Limpando todas as credenciais armazenadas...');

      // Remover dados do AsyncStorage
      await AsyncStorage.multiRemove([AUTH_KEY, BIOMETRIC_ENABLED_KEY]);

      // Remover credenciais do SecureStore
      try {
        await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
      } catch (secureError) {
        // Se não conseguir deletar do SecureStore, não é um erro crítico
        console.log('SecureStore item não existia ou já foi removido');
      }

      // Reset estado interno
      this.isAuthenticated = false;

      console.log('Todas as credenciais foram limpas com sucesso');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw error;
    }
  }
}

export default new AuthService();
