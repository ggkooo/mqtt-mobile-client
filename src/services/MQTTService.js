class MQTTService {
  constructor() {
    this.isConnected = false;
    this.subscriptions = [];
    this.onMessageCallbacks = [];
    this.brokerConfig = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectInterval = 3000;
    this.reconnectTimer = null;
    this.connectionPromise = null;
    this.ws = null;
    this.clientId = null;
    this.keepAliveInterval = null;
    this.messageId = 1;
    this.errorCallback = null;
  }

  // Método para definir callback de erro para notificações
  setErrorCallback(callback) {
    this.errorCallback = callback;
  }

  // Método para notificar erro de forma segura
  notifyError(error, title = 'Erro de Conexão MQTT') {
    if (this.errorCallback) {
      this.errorCallback(error, title);
    } else {
      console.error(`${title}:`, error);
    }
  }

  // Método para carregar configuração salva do AsyncStorage
  async loadSavedConfig() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const savedConfig = await AsyncStorage.getItem('mqtt_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config && config.brokerHost && config.brokerPort) {
          this.brokerConfig = {
            brokerHost: config.brokerHost,
            brokerPort: Number(config.brokerPort),
            clientId: config.clientId,
            username: config.useAuth ? config.username : null,
            password: config.useAuth ? config.password : null,
            options: {
              forceProtocol: config.protocol
            }
          };
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar configuração MQTT salva:', error);
      return false;
    }
  }

  // Método para inicializar automaticamente na startup do app
  async initializeOnStartup() {
    try {
      console.log('Inicializando MQTTService na startup...');

      // Carrega configuração salva
      const configLoaded = await this.loadSavedConfig();

      if (configLoaded && this.brokerConfig) {
        console.log('Configuração MQTT carregada, tentando conexão automática...');

        // Tenta conectar automaticamente
        await this.connect(
          this.brokerConfig.brokerHost,
          this.brokerConfig.brokerPort,
          this.brokerConfig.clientId,
          this.brokerConfig.username,
          this.brokerConfig.password,
          this.brokerConfig.options
        );

        console.log('Conexão MQTT automática na startup bem-sucedida');
        return true;
      } else {
        console.log('Sem configuração MQTT salva para conexão automática na startup');
        return false;
      }
    } catch (error) {
      console.error('Erro na inicialização MQTT automática:', error);
      this.notifyError(`Erro na conexão automática: ${error.message}`, 'Erro de Startup MQTT');
      return false;
    }
  }

  connect(brokerHost, brokerPort = 8080, clientId = null, username = null, password = null, options = {}) {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected && this.ws && this.ws.readyState === 1) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.forceDisconnect();

        this.clientId = clientId || `mqtt_mobile_${Math.random().toString(16).substr(2, 8)}`;
        this.tempBrokerConfig = {
          brokerHost,
          brokerPort: Number(brokerPort),
          clientId: this.clientId,
          username,
          password,
          options
        };

        this.attemptConnection(resolve, reject, 0);

      } catch (error) {
        console.error('Erro ao conectar:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  forceDisconnect() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;

      try {
        if (this.ws.readyState === 1) {
          this.ws.send(new Uint8Array([0xE0, 0x00]));
        }
      } catch (error) {
        console.log('Erro ao enviar DISCONNECT:', error.message);
      }

      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.connectionPromise = null;
  }

  attemptConnection(resolve, reject, attemptIndex = 0) {
    const { brokerHost, brokerPort, username, password } = this.tempBrokerConfig;
    const connectionAttempts = this.generateConnectionAttempts(brokerHost, brokerPort);
    const filteredAttempts = this.filterProblematicAttempts(connectionAttempts, brokerPort);

    if (attemptIndex >= filteredAttempts.length) {
      this.connectionPromise = null;
      const errorMsg = `Falha na conexão MQTT após ${filteredAttempts.length} tentativas. Verifique se o broker está rodando e a configuração está correta.`;
      console.error(errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    if (this.isConnected) {
      this.connectionPromise = null;
      resolve();
      return;
    }

    const attempt = filteredAttempts[attemptIndex];
    const wsUrl = `${attempt.protocol}://${brokerHost}:${brokerPort}${attempt.path}`;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(wsUrl, ['mqtt']);
      let attemptResolved = false;

      const timeoutDuration = this.getTimeoutForAttempt(attempt, attemptIndex);
      const attemptTimeout = setTimeout(() => {
        if (!attemptResolved && !this.isConnected) {
          attemptResolved = true;
          if (this.ws) {
            this.ws.close();
          }
          setTimeout(() => {
            this.attemptConnection(resolve, reject, attemptIndex + 1);
          }, 200);
        }
      }, timeoutDuration);

      this.ws.onopen = () => {
        if (attemptResolved) return;

        setTimeout(() => {
          if (this.ws && this.ws.readyState === 1) {
            this.sendConnectPacket(username, password);
          }
        }, 50);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data, resolve, attemptTimeout, attemptResolved);
      };

      this.ws.onerror = (error) => {
        if (attemptResolved) return;

        attemptResolved = true;
        clearTimeout(attemptTimeout);

        setTimeout(() => {
          this.attemptConnection(resolve, reject, attemptIndex + 1);
        }, 200);
      };

      this.ws.onclose = (event) => {
        if (attemptResolved) return;

        if (!this.isConnected) {
          attemptResolved = true;
          clearTimeout(attemptTimeout);

          if (attemptIndex < filteredAttempts.length - 1) {
            setTimeout(() => {
              this.attemptConnection(resolve, reject, attemptIndex + 1);
            }, 200);
          } else {
            this.handleDisconnection();
          }
        }
      };

    } catch (error) {
      console.error(`Erro na tentativa ${attemptIndex + 1}:`, error);
      setTimeout(() => {
        this.attemptConnection(resolve, reject, attemptIndex + 1);
      }, 200);
    }
  }

  filterProblematicAttempts(attempts, brokerPort) {
    const filtered = attempts.filter(attempt => {
      if (attempt.protocol === 'wss' && attempt.path === '') {
        return false;
      }
      return true;
    });

    return filtered;
  }

  getTimeoutForAttempt(attempt, attemptIndex) {
    if (attempt.protocol === 'wss' && attempt.path === '') {
      return 1000;
    }

    if (attemptIndex === 0) {
      return 5000;
    }

    return 3000;
  }

  // ...existing code...

  generateConnectionAttempts(brokerHost, brokerPort) {
    const forceProtocol = this.tempBrokerConfig?.options?.forceProtocol;

    if (forceProtocol) {
      return this.generateSingleProtocolAttempts(forceProtocol);
    }

    const isSecurePort = brokerPort === 8083 || brokerPort === 9001 || brokerPort === 443;
    const isStandardMQTTPort = brokerPort === 1883 || brokerPort === 8883;

    let attempts;

    if (isSecurePort) {
      attempts = [
        {
          protocol: 'wss',
          path: '/mqtt',
          description: 'WebSocket seguro com caminho /mqtt'
        },
        {
          protocol: 'wss',
          path: '/ws',
          description: 'WebSocket seguro com caminho /ws'
        },
        {
          protocol: 'wss',
          path: '/websocket',
          description: 'WebSocket seguro com caminho /websocket'
        },
        {
          protocol: 'ws',
          path: '/mqtt',
          description: 'WebSocket não seguro (fallback) com /mqtt'
        },
        {
          protocol: 'ws',
          path: '/ws',
          description: 'WebSocket não seguro (fallback) com /ws'
        }
      ];
    } else if (isStandardMQTTPort) {
      attempts = [
        {
          protocol: 'ws',
          path: '/mqtt',
          description: 'WebSocket não seguro com caminho /mqtt (padrão)'
        },
        {
          protocol: 'ws',
          path: '',
          description: 'WebSocket não seguro direto (porta MQTT padrão)'
        },
        {
          protocol: 'ws',
          path: '/ws',
          description: 'WebSocket não seguro com caminho /ws'
        }
      ];
    } else {
      attempts = [
        {
          protocol: 'ws',
          path: '/mqtt',
          description: 'WebSocket não seguro com caminho /mqtt'
        },
        {
          protocol: 'ws',
          path: '/ws',
          description: 'WebSocket não seguro com caminho /ws'
        },
        {
          protocol: 'ws',
          path: '/websocket',
          description: 'WebSocket com caminho /websocket'
        },
        {
          protocol: 'ws',
          path: '',
          description: 'WebSocket não seguro sem caminho específico'
        }
      ];
    }

    return attempts;
  }

  generateSingleProtocolAttempts(protocol) {
    const commonPaths = ['/mqtt', '/ws', '/websocket', ''];

    const attempts = commonPaths.map(path => ({
      protocol: protocol,
      path: path,
      description: `${protocol.toUpperCase()} ${path ? `com caminho ${path}` : 'sem caminho específico'}`
    }));

    const filtered = attempts.filter(attempt => {
      if (attempt.protocol === 'wss' && attempt.path === '') {
        return false;
      }
      return true;
    });


    return filtered;
  }

  getErrorDescription(error) {
    if (error && typeof error === 'object') {
      const errorInfo = {
        type: error._type || 'unknown',
        readyState: error.target?.readyState,
        url: error.target?.url
      };

      if (error.target?.readyState === 3) {
        return 'Conexão fechada - possível problema com SSL/TLS ou firewall';
      }

      return JSON.stringify(errorInfo);
    }
    return error.toString();
  }

  getCloseReason(code) {
    const closeReasons = {
      1000: 'Fechamento normal',
      1001: 'Endpoint indo embora',
      1002: 'Erro de protocolo',
      1003: 'Tipo de dados não suportado',
      1006: 'Fechamento anormal - possível problema SSL/TLS ou rede',
      1011: 'Erro interno do servidor',
      1012: 'Serviço reiniciando',
      1013: 'Tente novamente mais tarde',
      1014: 'Gateway inválido',
      1015: 'Falha no handshake TLS'
    };

    return closeReasons[code] || `Código desconhecido: ${code}`;
  }

  sendConnectPacket(username, password) {
    try {
      if (!this.ws || this.ws.readyState !== 1) {
        return;
      }

      const protocolName = 'MQTT';
      const protocolLevel = 4;

      let connectFlags = 0x02;
      if (username) connectFlags |= 0x80;
      if (password) connectFlags |= 0x40;

      const keepAlive = 60;

      let payload = [];
      payload = payload.concat(this.encodeString(this.clientId));

      if (username) {
        payload = payload.concat(this.encodeString(username));
      }

      if (password) {
        payload = payload.concat(this.encodeString(password));
      }

      const variableHeader = this.encodeString(protocolName)
        .concat([protocolLevel, connectFlags])
        .concat([(keepAlive >> 8) & 0xFF, keepAlive & 0xFF]);

      const remainingLength = variableHeader.length + payload.length;
      const remainingLengthBytes = this.encodeVariableLength(remainingLength);

      const completePacket = [0x10]
        .concat(remainingLengthBytes)
        .concat(variableHeader)
        .concat(payload);

      this.ws.send(new Uint8Array(completePacket));

    } catch (error) {
      console.error('Erro ao enviar CONNECT packet:', error);

      if (error.name === 'InvalidStateError' || error.message.includes('INVALID_STATE_ERR')) {
        setTimeout(() => {
          this.sendConnectPacket(username, password);
        }, 200);
      }
    }
  }

  encodeString(str) {
    const bytes = new TextEncoder().encode(str);
    return [(bytes.length >> 8) & 0xFF, bytes.length & 0xFF].concat(Array.from(bytes));
  }

  encodeVariableLength(length) {
    const bytes = [];
    let remaining = length;

    do {
      let byte = remaining % 128;
      remaining = Math.floor(remaining / 128);
      if (remaining > 0) {
        byte |= 0x80;
      }
      bytes.push(byte);
    } while (remaining > 0);

    return bytes;
  }

  handleMessage(data, resolve = null, attemptTimeout = null, attemptResolved = null) {
    try {
      const bytes = new Uint8Array(data);
      const packetType = (bytes[0] >> 4) & 0x0F;

      switch (packetType) {
        case 2:
          this.handleConnAck(bytes, resolve, attemptTimeout, attemptResolved);
          break;
        case 3:
          this.handlePublish(bytes);
          break;
        case 4:
          break;
        case 9:
          break;
        case 11:
          break;
        case 13:
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }

  getPacketTypeName(type) {
    const names = {
      1: 'CONNECT',
      2: 'CONNACK',
      3: 'PUBLISH',
      4: 'PUBACK',
      5: 'PUBREC',
      6: 'PUBREL',
      7: 'PUBCOMP',
      8: 'SUBSCRIBE',
      9: 'SUBACK',
      10: 'UNSUBSCRIBE',
      11: 'UNSUBACK',
      12: 'PINGREQ',
      13: 'PINGRESP',
      14: 'DISCONNECT'
    };
    return names[type] || 'UNKNOWN';
  }

  handleConnAck(bytes, resolve = null, attemptTimeout = null, attemptResolved = null) {
    const returnCode = bytes[3];

    if (returnCode === 0) {
      if (this.isConnected) {
        return;
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.brokerConfig = { ...this.tempBrokerConfig };
      delete this.tempBrokerConfig;

      if (attemptTimeout) {
        clearTimeout(attemptTimeout);
      }

      if (resolve && !attemptResolved) {
        this.connectionPromise = null;
        resolve();
      }

      this.startKeepAlive();

    } else {
      console.error('Conexão rejeitada pelo broker, código:', returnCode);
      const errorMessages = {
        1: 'Versão do protocolo não suportada',
        2: 'Client ID rejeitado',
        3: 'Servidor indisponível',
        4: 'Username/password inválidos',
        5: 'Não autorizado'
      };
      const errorMsg = errorMessages[returnCode] || 'Erro desconhecido';
      console.error(`Motivo: ${errorMsg}`);


      if (this.ws) {
        this.ws.close();
      }
    }
  }

  handlePublish(bytes) {
    try {
      let pos = 2;

      const topicLength = (bytes[pos] << 8) | bytes[pos + 1];
      pos += 2;
      const topic = new TextDecoder().decode(bytes.slice(pos, pos + topicLength));
      pos += topicLength;

      const qos = (bytes[0] >> 1) & 0x03;
      if (qos > 0) {
        pos += 2;
      }

      const payload = new TextDecoder().decode(bytes.slice(pos));

      this.onMessageCallbacks.forEach(callback => {
        try {
          callback(topic, payload);
        } catch (error) {
          console.error('Erro no callback:', error);
        }
      });

    } catch (error) {
      console.error('Erro ao processar PUBLISH:', error);
    }
  }

  startKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(new Uint8Array([0xC0, 0x00]));
      }
    }, 30000);
  }

  disconnect() {
    try {
      this.forceDisconnect();
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }

  publish(topic, message, qos = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('Cliente MQTT não está conectado'));
        return;
      }

      if (this.ws.readyState !== 1) {
        reject(new Error(`WebSocket não está aberto. Estado: ${this.ws.readyState}`));
        return;
      }

      try {
        const messageBytes = new TextEncoder().encode(String(message));
        const topicBytes = this.encodeString(topic);

        let fixedHeader = [0x30];
        if (qos > 0) {
          fixedHeader[0] |= (qos << 1);
        }

        let variableHeader = topicBytes;
        let packetId = null;

        if (qos > 0) {
          packetId = this.messageId++;
          variableHeader = variableHeader.concat([(packetId >> 8) & 0xFF, packetId & 0xFF]);
        }

        const remainingLength = variableHeader.length + messageBytes.length;
        const remainingLengthBytes = this.encodeVariableLength(remainingLength);

        const packet = [fixedHeader[0]]
          .concat(remainingLengthBytes)
          .concat(variableHeader)
          .concat(Array.from(messageBytes));

        this.ws.send(new Uint8Array(packet));

        if (qos === 0) {
          resolve();
        } else {
          setTimeout(() => {
            resolve();
          }, 5000);
        }

      } catch (error) {
        console.error('Erro ao publicar:', error);
        reject(error);
      }
    });
  }

  subscribe(topic, qos = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('Cliente MQTT não está conectado'));
        return;
      }

      try {
        const topicBytes = this.encodeString(topic);
        const packetId = this.messageId++;

        const variableHeader = [(packetId >> 8) & 0xFF, packetId & 0xFF];
        const payload = topicBytes.concat([qos]);

        const remainingLength = variableHeader.length + payload.length;
        const remainingLengthBytes = this.encodeVariableLength(remainingLength);

        const packet = [0x82]
          .concat(remainingLengthBytes)
          .concat(variableHeader)
          .concat(payload);

        this.ws.send(new Uint8Array(packet));

        if (!this.subscriptions.includes(topic)) {
          this.subscriptions.push(topic);
        }

        resolve();
      } catch (error) {
        console.error('Erro ao se inscrever:', error);
        reject(error);
      }
    });
  }

  unsubscribe(topic) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('Cliente MQTT não está conectado'));
        return;
      }

      try {
        const topicBytes = this.encodeString(topic);
        const packetId = this.messageId++;

        const packet = [0xA2]
          .concat([topicBytes.length + 2])
          .concat([(packetId >> 8) & 0xFF, packetId & 0xFF])
          .concat(topicBytes);

        this.ws.send(new Uint8Array(packet));
        this.subscriptions = this.subscriptions.filter(sub => sub !== topic);

        resolve();
      } catch (error) {
        console.error('Erro ao se desinscrever:', error);
        reject(error);
      }
    });
  }

  addMessageCallback(callback) {
    this.onMessageCallbacks.push(callback);
  }

  removeMessageCallback(callback) {
    this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
  }

  handleDisconnection() {
    const wasConnected = this.isConnected;
    this.isConnected = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (wasConnected) {
      if (this.reconnectAttempts < this.maxReconnectAttempts && this.brokerConfig) {
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
          this.reconnect();
        }, this.reconnectInterval);
      }
    }
  }

  async reconnect() {
    // Se não há configuração salva no serviço, tenta carregar do AsyncStorage
    if (!this.brokerConfig) {
      console.log('Configuração MQTT não encontrada, tentando carregar configuração salva...');
      const configLoaded = await this.loadSavedConfig();
      if (!configLoaded) {
        console.error('Não foi possível carregar configuração MQTT para reconexão');
        this.notifyError('Configuração MQTT não encontrada. Verifique as configurações.', 'Erro de Reconexão');
        return;
      }
    }

    // Verificar se a configuração tem os campos necessários
    if (!this.brokerConfig.brokerHost || !this.brokerConfig.brokerPort) {
      console.error('Configuração MQTT incompleta para reconexão');
      this.notifyError('Configuração MQTT incompleta. Verifique host e porta.', 'Erro de Reconexão');
      return;
    }

    try {
      console.log('Tentando reconectar ao broker MQTT...');
      await this.connect(
        this.brokerConfig.brokerHost,
        this.brokerConfig.brokerPort,
        this.brokerConfig.clientId,
        this.brokerConfig.username,
        this.brokerConfig.password,
        this.brokerConfig.options
      );

      // Re-inscrever em todos os tópicos salvos
      for (const topic of this.subscriptions) {
        try {
          await this.subscribe(topic);
        } catch (err) {
          console.error(`Erro ao re-inscrever no tópico ${topic}:`, err);
        }
      }

      console.log('Reconexão MQTT bem-sucedida');

    } catch (error) {
      console.error('Falha na reconexão MQTT:', error);
      this.notifyError(`Falha na reconexão: ${error.message}`, 'Erro de Reconexão');
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      brokerConfig: this.brokerConfig,
      subscriptions: [...this.subscriptions],
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async testConnection() {
    if (!this.isConnected) {
      throw new Error('Não conectado ao broker MQTT');
    }

    const testTopic = 'test/mobile_app';
    const testMessage = JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Teste de conexão da aplicação móvel',
      client: this.clientId,
      platform: 'React Native',
      test: true
    });

    await this.publish(testTopic, testMessage);

    return {
      success: true,
      topic: testTopic,
      message: testMessage,
      timestamp: new Date().toISOString()
    };
  }
}

export default new MQTTService();
