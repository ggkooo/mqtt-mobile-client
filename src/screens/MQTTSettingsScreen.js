import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MQTTService from '../services/MQTTService';

const MQTT_CONFIG_KEY = 'mqtt_config';

const MQTTSettingsScreen = ({ navigation }) => {
  const [config, setConfig] = useState({
    brokerHost: '',
    brokerPort: '8080',
    clientId: '',
    username: '',
    password: '',
    useAuth: false,
  });

  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadConfig();
    setIsConnected(MQTTService.isConnected);
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem(MQTT_CONFIG_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração MQTT:', error);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      await AsyncStorage.setItem(MQTT_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Erro ao salvar configuração MQTT:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateConfig = () => {
    if (!config.brokerHost.trim()) {
      Alert.alert('Erro', 'Endereço do broker é obrigatório');
      return false;
    }
    if (!config.brokerPort.trim()) {
      Alert.alert('Erro', 'Porta do broker é obrigatória');
      return false;
    }
    if (isNaN(config.brokerPort) || config.brokerPort < 1 || config.brokerPort > 65535) {
      Alert.alert('Erro', 'Porta deve ser um número entre 1 e 65535');
      return false;
    }

    // Avisar sobre portas comuns que não são WebSocket
    const port = parseInt(config.brokerPort);
    if (port === 1883) {
      Alert.alert(
        'Aviso sobre Porta',
        'A porta 1883 é para MQTT TCP, não WebSocket. Para React Native/Expo, use portas WebSocket como:\n\n• 8080 (comum para WebSocket MQTT)\n• 8000 (HiveMQ público)\n• 9001 (Mosquitto WebSocket padrão)\n• 8083 (MQTT over WebSocket seguro)\n\nContinuar mesmo assim?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', style: 'default' }
        ]
      );
      return false;
    }

    if (config.useAuth && (!config.username.trim() || !config.password.trim())) {
      Alert.alert('Erro', 'Usuário e senha são obrigatórios quando autenticação está ativa');
      return false;
    }
    return true;
  };

  const handleConnect = async () => {
    if (!validateConfig()) return;

    setConnecting(true);
    try {
      await saveConfig(config);

      if (MQTTService.isConnected) {
        MQTTService.disconnect();
      }

      await MQTTService.connect(
        config.brokerHost,
        parseInt(config.brokerPort),
        config.clientId || null,
        config.useAuth ? config.username : null,
        config.useAuth ? config.password : null
      );

      setIsConnected(true);
      Alert.alert('Sucesso', 'Conectado ao broker MQTT com sucesso!');
    } catch (error) {
      setIsConnected(false);
      Alert.alert('Erro', `Falha na conexão: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    MQTTService.disconnect();
    setIsConnected(false);
    Alert.alert('Info', 'Desconectado do broker MQTT');
  };

  const testConnection = async () => {
    if (!isConnected) {
      Alert.alert('Aviso', 'Conecte-se ao broker primeiro');
      return;
    }

    try {
      const testMessage = await MQTTService.testConnection();
      Alert.alert(
        'Teste Bem-sucedido!',
        `Mensagem de teste enviada com sucesso!\n\nTópico: test/mobile_app\nMensagem: ${testMessage}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro no Teste', `Falha no teste: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Status da conexão */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={isConnected ? 'wifi' : 'wifi-outline'}
                size={32}
                color={isConnected ? '#4CAF50' : '#F44336'}
              />
            </View>
            <Text style={styles.statusText}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>

          {/* Configurações do broker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurações do Broker</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço do Broker *</Text>
              <TextInput
                style={styles.input}
                value={config.brokerHost}
                onChangeText={(value) => handleInputChange('brokerHost', value)}
                placeholder="Ex: broker.hivemq.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Porta *</Text>
              <TextInput
                style={styles.input}
                value={config.brokerPort}
                onChangeText={(value) => handleInputChange('brokerPort', value)}
                placeholder="8080"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client ID (opcional)</Text>
              <TextInput
                style={styles.input}
                value={config.clientId}
                onChangeText={(value) => handleInputChange('clientId', value)}
                placeholder="Deixe vazio para gerar automaticamente"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Autenticação */}
          <View style={styles.section}>
            <View style={styles.authHeader}>
              <Text style={styles.sectionTitle}>Autenticação</Text>
              <Switch
                value={config.useAuth}
                onValueChange={(value) => handleInputChange('useAuth', value)}
                trackColor={{ false: '#ddd', true: '#2196F3' }}
                thumbColor={config.useAuth ? '#fff' : '#fff'}
              />
            </View>

            {config.useAuth && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Usuário *</Text>
                  <TextInput
                    style={styles.input}
                    value={config.username}
                    onChangeText={(value) => handleInputChange('username', value)}
                    placeholder="Nome de usuário"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Senha *</Text>
                  <TextInput
                    style={styles.input}
                    value={config.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Senha"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              </>
            )}
          </View>

          {/* Botões de ação */}
          <View style={styles.buttonContainer}>
            {!isConnected ? (
              <TouchableOpacity
                style={[styles.connectButton, connecting && styles.disabledButton]}
                onPress={handleConnect}
                disabled={connecting}
              >
                <Text style={styles.connectButtonText}>
                  {connecting ? 'Conectando...' : 'Conectar'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.connectedButtons}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={testConnection}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.testButtonText}>Testar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Informações */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Dicas de Configuração</Text>
            <Text style={styles.infoText}>
              🔌 <Text style={{fontWeight: 'bold'}}>Para seu broker (broker.giordanoberwig.xyz):</Text>
            </Text>
            <Text style={styles.infoText}>
              • Use porta 8080, 9001 ou 8083 para WebSocket MQTT
            </Text>
            <Text style={styles.infoText}>
              • Porta 1883 é apenas para TCP (não funciona no React Native)
            </Text>
            <Text style={styles.infoText}>
              • Configure WebSocket no Mosquitto: listener 9001, protocol websockets
            </Text>
            <Text style={styles.infoText}>
              📡 <Text style={{fontWeight: 'bold'}}>Brokers públicos para teste:</Text>
            </Text>
            <Text style={styles.infoText}>
              • broker.hivemq.com:8000 (sempre funciona)
            </Text>
            <Text style={styles.infoText}>
              • test.mosquitto.org:8080 (backup)
            </Text>
            <Text style={styles.infoText}>
              💡 <Text style={{fontWeight: 'bold'}}>Agora com conexão real!</Text> Mensagens aparecerão em clientes MQTT externos
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusIcon: {
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  authHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  disconnectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default MQTTSettingsScreen;
