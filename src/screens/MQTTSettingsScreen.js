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
    protocol: 'ws', // Novo campo para protocolo
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
      // Silent fail - defaults will be used
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      await AsyncStorage.setItem(MQTT_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      // Silent fail
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
      Alert.alert('Error', 'Broker address is required');
      return false;
    }
    if (!config.brokerPort.trim()) {
      Alert.alert('Error', 'Broker port is required');
      return false;
    }
    if (isNaN(config.brokerPort) || config.brokerPort < 1 || config.brokerPort > 65535) {
      Alert.alert('Error', 'Port must be a number between 1 and 65535');
      return false;
    }

    // Warn about common ports that are not WebSocket
    const port = parseInt(config.brokerPort);
    if (port === 1883) {
      Alert.alert(
        'Port Warning',
        'Port 1883 is for MQTT TCP, not WebSocket. For React Native/Expo, use WebSocket ports like:\n\n• 8080 (common for WebSocket MQTT)\n• 8000 (HiveMQ public)\n• 9001 (Mosquitto WebSocket default)\n• 8083 (MQTT over secure WebSocket)\n\nContinue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', style: 'default' }
        ]
      );
      return false;
    }

    if (config.useAuth && (!config.username.trim() || !config.password.trim())) {
      Alert.alert('Error', 'Username and password are required when authentication is active');
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
        config.useAuth ? config.password : null,
        {
          forceProtocol: config.protocol // Force protocol selected by user
        }
      );

      setIsConnected(true);
      Alert.alert('Success', 'Connected to MQTT broker successfully!');
    } catch (error) {
      setIsConnected(false);
      Alert.alert('Error', `Connection failed: ${error.message || 'Unknown error'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    MQTTService.disconnect();
    setIsConnected(false);
    Alert.alert('Info', 'Disconnected from MQTT broker');
  };

  const testConnection = async () => {
    if (!isConnected) {
      Alert.alert('Warning', 'Connect to broker first');
      return;
    }

    try {
      await MQTTService.testConnection();
      Alert.alert(
        'Test Successful!',
        'Test message sent successfully to MQTT broker!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Error', `Test failed: ${error.message}`);
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
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          {/* Broker settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Broker Settings</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Broker Address *</Text>
              <TextInput
                style={styles.input}
                value={config.brokerHost}
                onChangeText={(value) => handleInputChange('brokerHost', value)}
                placeholder="e.g., broker.hivemq.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Port *</Text>
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
              <Text style={styles.label}>WebSocket Protocol *</Text>
              <View style={styles.protocolContainer}>
                <TouchableOpacity
                  style={[
                    styles.protocolButton,
                    config.protocol === 'ws' && styles.protocolButtonActive
                  ]}
                  onPress={() => handleInputChange('protocol', 'ws')}
                >
                  <Text style={[
                    styles.protocolButtonText,
                    config.protocol === 'ws' && styles.protocolButtonTextActive
                  ]}>
                    ws://
                  </Text>
                  <Text style={[
                    styles.protocolDescription,
                    config.protocol === 'ws' && styles.protocolDescriptionActive
                  ]}>
                    Not secure
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.protocolButton,
                    config.protocol === 'wss' && styles.protocolButtonActive
                  ]}
                  onPress={() => handleInputChange('protocol', 'wss')}
                >
                  <Text style={[
                    styles.protocolButtonText,
                    config.protocol === 'wss' && styles.protocolButtonTextActive
                  ]}>
                    wss://
                  </Text>
                  <Text style={[
                    styles.protocolDescription,
                    config.protocol === 'wss' && styles.protocolDescriptionActive
                  ]}>
                    Secure (SSL)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.protocolInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#666"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.protocolInfoText}>
                  {config.protocol === 'ws'
                    ? 'Unencrypted connection. Use for local development.'
                    : 'Encrypted connection with SSL/TLS. Recommended for production.'
                  }
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client ID (optional)</Text>
              <TextInput
                style={styles.input}
                value={config.clientId}
                onChangeText={(value) => handleInputChange('clientId', value)}
                placeholder="Leave empty to auto-generate"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Authentication */}
          <View style={styles.section}>
            <View style={styles.authHeader}>
              <Text style={styles.sectionTitle}>Authentication</Text>
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
                  <Text style={styles.label}>Username *</Text>
                  <TextInput
                    style={styles.input}
                    value={config.username}
                    onChangeText={(value) => handleInputChange('username', value)}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={config.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              </>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {!isConnected ? (
              <TouchableOpacity
                style={[styles.connectButton, connecting && styles.disabledButton]}
                onPress={handleConnect}
                disabled={connecting}
              >
                <Text style={styles.connectButtonText}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.connectedButtons}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={testConnection}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.testButtonText}>Test</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Information */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Protocol Configuration</Text>
            <Text style={styles.infoText}>
              <Text style={{fontWeight: 'bold'}}>ws://</Text> - Unencrypted connection for development
            </Text>
            <Text style={styles.infoText}>
              <Text style={{fontWeight: 'bold'}}>wss://</Text> - Secure connection with SSL/TLS for production
            </Text>
            <Text style={styles.infoText}>
              💡 Choose the appropriate protocol for your environment and MQTT broker
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
  protocolContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  protocolButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  protocolButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  protocolButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  protocolButtonTextActive: {
    color: '#2196F3',
  },
  protocolDescription: {
    fontSize: 12,
    color: '#999',
  },
  protocolDescriptionActive: {
    color: '#2196F3',
  },
  protocolInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 6,
    marginTop: 5,
  },
  protocolInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default MQTTSettingsScreen;
