import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Switch } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthService from '../services/AuthService';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin'); // Pré-preenchido com credencial padrão
  const [password, setPassword] = useState('1234');  // Pré-preenchido com credencial padrão
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricPreference();
    checkIfFirstTime();
  }, []);

  const checkIfFirstTime = async () => {
    try {
      const hasCredentials = await AuthService.getStoredCredentials();
      setIsFirstTime(!hasCredentials);
    } catch (error) {
      console.error('Erro ao verificar primeiro acesso:', error);
      setIsFirstTime(true);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const biometricCheck = await AuthService.isBiometricAvailable();
      setBiometricAvailable(biometricCheck.available);

      if (biometricCheck.available) {
        const types = await AuthService.getAvailableAuthenticationTypes();
        setBiometricTypes(types);
      }
    } catch (error) {
      console.error('Erro ao verificar biometria:', error);
    }
  };

  const loadBiometricPreference = async () => {
    try {
      const enabled = await AuthService.isBiometricEnabled();
      setBiometricEnabled(enabled);
    } catch (error) {
      console.error('Erro ao carregar preferência biométrica:', error);
    }
  };

  const handleBiometricToggle = async (value) => {
    try {
      setBiometricEnabled(value);
      await AuthService.setBiometricEnabled(value);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a configuração de biometria');
      setBiometricEnabled(!value);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      const result = await AuthService.authenticateWithBiometrics();

      if (result.success) {
        login(); // Atualiza o contexto de autenticação
      } else {
        Alert.alert('Erro', result.error || 'Falha na autenticação biométrica');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro inesperado na autenticação biométrica');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      const result = await AuthService.loginWithCredentials(username.trim(), password);

      if (result.success) {
        if (result.firstTime) {
          // PRIMEIRO LOGIN - mostrar opção para ativar biometria
          if (biometricAvailable) {
            Alert.alert(
              'Bem-vindo!',
              'Login realizado com sucesso! Deseja ativar a autenticação biométrica para próximos acessos?',
              [
                {
                  text: 'Não, obrigado',
                  style: 'cancel',
                  onPress: () => login()
                },
                {
                  text: 'Sim, ativar',
                  onPress: async () => {
                    try {
                      await AuthService.setBiometricEnabled(true);
                      Alert.alert(
                        'Biometria Ativada!',
                        'A partir do próximo acesso, você poderá usar biometria para entrar no app.',
                        [{ text: 'OK', onPress: () => login() }]
                      );
                    } catch (error) {
                      Alert.alert('Erro', 'Não foi possível ativar a biometria');
                      login();
                    }
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Bem-vindo!',
              'Login realizado com sucesso! Suas credenciais foram salvas com segurança.',
              [{ text: 'OK', onPress: () => login() }]
            );
          }
        } else {
          // LOGIN SUBSEQUENTE - apenas entrar no app
          login();
        }
      } else {
        Alert.alert('Erro', result.error || 'Falha no login');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro inesperado no login');
    } finally {
      setLoading(false);
    }
  };

  const getBiometricText = () => {
    if (!biometricAvailable) return '';

    if (biometricTypes.length > 0) {
      return `Usar ${biometricTypes.join(' ou ')}`;
    }

    return 'Usar Biometria';
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
              label="Usuário"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
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
              label="Senha"
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

            {/* Switch de Biometria - sempre aparece se disponível */}
            {biometricAvailable && (
              <View style={styles.biometricContainer}>
                <View style={styles.biometricTextContainer}>
                  <Text style={styles.biometricLabel}>
                    Utilizar biometria para futuros acessos
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

            {/* Botão de Login */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonText}
              buttonColor="#8E8E93"
            >
              Entrar
            </Button>

            {/* Informação sobre primeiro acesso */}
            <Text style={styles.infoText}>
              {isFirstTime
                ? "No primeiro acesso, suas credenciais serão salvas com segurança no dispositivo."
                : "Digite suas credenciais para acessar o aplicativo."
              }
            </Text>
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  biometricTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  biometricLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    marginBottom: 0,
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#8E8E93',
  },
  biometricButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
});

export default LoginScreen;
