import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

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

    // Listener para mudança de estado do app (background/foreground)
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state mudou de', appState.current, 'para', nextAppState);

      // Detecta quando o app realmente vai para background (não apenas inactive)
      if (nextAppState === 'background') {
        console.log('App foi para background - marcando flag');
        wasInBackground.current = true;
      }

      // Detecta quando o app volta para active vindos do background
      else if (nextAppState === 'active' && wasInBackground.current) {
        console.log('App voltou do background para active - verificando se deve bloquear');

        try {
          // Verificar se o usuário estava autenticado e tem biometria configurada
          const currentAuth = await AsyncStorage.getItem(AUTH_KEY);
          const biometricEnabled = await AuthService.isBiometricEnabled();
          const biometricAvailable = await AuthService.isBiometricAvailable();

          console.log('Current auth:', currentAuth);
          console.log('Biometric enabled:', biometricEnabled);
          console.log('Biometric available:', biometricAvailable.available);
          console.log('Current isAuthenticated:', isAuthenticated);

          // Só bloqueia se: estava autenticado + tem biometria configurada + biometria disponível
          if (currentAuth === 'true' && biometricEnabled && biometricAvailable.available) {
            console.log('Bloqueando app - exigindo biometria após retorno do background');
            setIsAuthenticated(false);
            setNeedsBiometricAuth(true);
          } else {
            console.log('Não bloqueando - condições não atendidas');
          }
        } catch (error) {
          console.error('Erro ao verificar status de autenticação:', error);
        }

        // Reset da flag
        wasInBackground.current = false;
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, []); // Removido isAuthenticated da dependência

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // Verifica se há credenciais salvas
      const hasCredentials = await AuthService.getStoredCredentials();

      if (!hasCredentials) {
        // PRIMEIRO ACESSO - sempre vai para login tradicional (sem opção de biometria)
        console.log('Primeiro acesso - necessário login tradicional para salvar credenciais');
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
        return;
      }

      // JÁ TEM CREDENCIAIS SALVAS - verifica se deve usar biometria
      const biometricEnabled = await AuthService.isBiometricEnabled();
      const biometricAvailable = await AuthService.isBiometricAvailable();

      if (biometricEnabled && biometricAvailable.available) {
        // Tem credenciais + biometria ativada = mostrar tela de biometria automática
        console.log('Credenciais salvas + biometria configurada - mostrando autenticação biométrica automática');
        setIsAuthenticated(false);
        setNeedsBiometricAuth(true);
      } else {
        // Tem credenciais mas sem biometria = mostrar login normal
        console.log('Credenciais salvas mas sem biometria - mostrando login tradicional');
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
      setIsAuthenticated(false);
      setNeedsBiometricAuth(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    console.log('Login executado - atualizando estado para true');
    setIsAuthenticated(true);
    setNeedsBiometricAuth(false);
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      console.log('Logout executado - atualizando estado para false');
      setIsAuthenticated(false);
      setNeedsBiometricAuth(false);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // Função para forçar bloqueio biométrico (útil para testes ou bloqueio manual)
  const lockApp = async () => {
    try {
      console.log('Bloqueio manual acionado - exigindo autenticação biométrica');
      const biometricEnabled = await AuthService.isBiometricEnabled();
      const biometricAvailable = await AuthService.isBiometricAvailable();

      if (biometricEnabled && biometricAvailable.available) {
        setIsAuthenticated(false);
        setNeedsBiometricAuth(true);
        console.log('App bloqueado manualmente - biometria exigida');
      } else {
        // Se não tem biometria, vai para tela de login normal
        setIsAuthenticated(false);
        setNeedsBiometricAuth(false);
        console.log('App bloqueado manualmente - login tradicional exigido');
      }
    } catch (error) {
      console.error('Erro ao bloquear app:', error);
      // Em caso de erro, vai para login normal por segurança
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
