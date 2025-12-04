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

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o app',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });

      if (result.success) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');

        // Log do warning se existir, mas não bloquear o sucesso
        if (result.warning) {
          console.warn('Warning na autenticação biométrica:', result.warning);
        }

        return { success: true, warning: result.warning };
      } else {
        // Tratamento específico para diferentes tipos de erro
        let errorMessage = 'Autenticação cancelada';
        if (result.error) {
          errorMessage = result.error;
        }

        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return { success: false, error: error.message };
    }
  }

  // Autentica com API externa
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
      console.error('Erro de rede na autenticação via API:', error);
      return { success: false, error: 'Erro de conexão com o servidor. Verifique sua internet.' };
    }
  }

  // Login com usuário e senha
  async loginWithCredentials(username, password) {
    try {
      // AUTENTICAÇÃO EXCLUSIVA VIA API
      const apiResult = await this.authenticateWithAPI(username, password);

      if (apiResult.success) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');

        // Verificar se é primeira vez (se não tem credenciais salvas)
        const storedCredentials = await this.getStoredCredentials();
        const isFirstTime = !storedCredentials;

        // Salvar credenciais do usuário autenticado via API
        await this.saveCredentials(username, password);

        return {
          success: true,
          method: 'api',
          userData: apiResult.userData,
          firstTime: isFirstTime
        };
      }

      // Se API falhou, verificar se são credenciais já salvas localmente (para funcionamento offline)
      const storedCredentials = await this.getStoredCredentials();

      if (storedCredentials &&
          storedCredentials.username === username &&
          storedCredentials.password === password) {
        this.isAuthenticated = true;
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        return { success: true, method: 'stored' };
      }

      // Se chegou até aqui, as credenciais são inválidas
      return {
        success: false,
        error: 'Credenciais inválidas. Verifique seu email e senha.'
      };
    } catch (error) {
      console.error('Erro no processo de login:', error);
      return { success: false, error: 'Erro interno durante o login. Tente novamente.' };
    }
  }

  // Verificar conectividade com a API
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

      // API está acessível se retornou qualquer resposta HTTP válida (mesmo que seja erro de autenticação)
      const isConnected = response.status >= 200 && response.status < 500;
      return isConnected;
    } catch (error) {
      return false;
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

  // Logout - limpa todas as credenciais e configurações
  async logout() {
    try {
      // Usar clearAllData para limpar tudo
      await this.clearAllData();

      // Executar teste para verificar se tudo foi limpo corretamente
      await this.testPostLogoutState();
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  // Remove todas as credenciais (reset completo)
  async clearAllData() {
    try {
      // Remover dados do AsyncStorage
      await AsyncStorage.multiRemove([AUTH_KEY, BIOMETRIC_ENABLED_KEY]);

      // Remover credenciais do SecureStore
      try {
        await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
      } catch (secureError) {
        // SecureStore item não existia ou já foi removido
      }

      // Reset estado interno
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw error;
    }
  }

  // Função de teste para verificar estado pós-logout
  async testPostLogoutState() {
    try {
      const authKey = await AsyncStorage.getItem(AUTH_KEY);
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const storedCredentials = await this.getStoredCredentials();

      const shouldShowLogin = !authKey && !storedCredentials && !biometricEnabled;

      return {
        authKey,
        biometricEnabled,
        hasStoredCredentials: !!storedCredentials,
        isAuthenticated: this.isAuthenticated,
        shouldShowLogin
      };
    } catch (error) {
      console.error('Erro ao testar estado pós-logout:', error);
      return null;
    }
  }
}

export default new AuthService();
