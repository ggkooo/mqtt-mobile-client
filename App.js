import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import AddActionScreen from './src/screens/AddActionScreen';
import MQTTSettingsScreen from './src/screens/MQTTSettingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import BiometricAuthScreen from './src/screens/BiometricAuthScreen';
import NotificationService from './src/services/NotificationService';
import AuthService from './src/services/AuthService';
import MQTTService from './src/services/MQTTService';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, needsBiometricAuth } = useAuth();

  useEffect(() => {
    // Inicialização do app
    const initializeApp = async () => {
      try {
        // LIMPEZA DE CREDENCIAIS DESABILITADA - Mantendo integração com API
        // console.log('Iniciando limpeza das credenciais antigas...');
        // await AuthService.clearAllData();
        // console.log('Credenciais antigas removidas - app resetado para estado inicial');

        // Inicializar permissões de notificação
        await NotificationService.requestPermissions();

        // Tentar inicializar conexão MQTT automática
        console.log('Tentando inicialização MQTT automática...');
        await MQTTService.initializeOnStartup();
      } catch (error) {
        console.error('Erro na inicialização do app:', error);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            {needsBiometricAuth ? (
              <Stack.Screen
                name="BiometricAuth"
                component={BiometricAuthScreen}
                options={{
                  gestureEnabled: false,
                  headerShown: false
                }}
              />
            ) : (
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  gestureEnabled: false,
                  headerShown: false
                }}
              />
            )}
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                gestureEnabled: false
              }}
            />
            <Stack.Screen
              name="AddAction"
              component={AddActionScreen}
              options={{
                headerShown: true,
                title: 'Nova Ação',
                headerStyle: {
                  backgroundColor: '#8E8E93',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="MQTTSettings"
              component={MQTTSettingsScreen}
              options={{
                headerShown: true,
                title: 'Configurações MQTT',
                headerStyle: {
                  backgroundColor: '#8E8E93',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
