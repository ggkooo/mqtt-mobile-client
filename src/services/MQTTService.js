// Simulação de serviço MQTT para demonstração
// Em um ambiente real, você implementaria a conexão MQTT real

class MQTTService {
  constructor() {
    this.isConnected = false;
    this.subscriptions = [];
    this.onMessageCallbacks = [];
    this.brokerConfig = null;
  }

  connect(brokerHost, brokerPort = 8080, clientId = null, username = null, password = null) {
    return new Promise((resolve, reject) => {
      try {
        // Simular delay de conexão
        setTimeout(() => {
          this.brokerConfig = {
            brokerHost,
            brokerPort,
            clientId: clientId || `mqtt_client_${Math.random().toString(16).substr(2, 8)}`,
            username,
            password
          };

          this.isConnected = true;
          console.log('Simulação: Conectado ao broker MQTT');
          resolve();
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.isConnected = false;
    this.brokerConfig = null;
    console.log('Simulação: Desconectado do broker MQTT');
  }

  publish(topic, message, qos = 0) {
    if (!this.isConnected) {
      throw new Error('Cliente MQTT não está conectado');
    }

    // Simular publicação
    console.log(`Simulação: Mensagem enviada para ${topic}: ${message}`);

    // Para demonstração, você pode implementar aqui a lógica real do MQTT
    // usando uma biblioteca como paho-mqtt ou mqtt.js

    return Promise.resolve();
  }

  subscribe(topic, qos = 0) {
    if (!this.isConnected) {
      throw new Error('Cliente MQTT não está conectado');
    }

    this.subscriptions.push(topic);
    console.log(`Simulação: Inscrito no tópico: ${topic}`);
  }

  unsubscribe(topic) {
    if (!this.isConnected) {
      return;
    }

    this.subscriptions = this.subscriptions.filter(sub => sub !== topic);
    console.log(`Simulação: Desinscrito do tópico: ${topic}`);
  }

  addMessageCallback(callback) {
    this.onMessageCallbacks.push(callback);
  }

  removeMessageCallback(callback) {
    this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
  }

  // Método para simular recebimento de mensagens (para teste)
  simulateMessage(topic, message) {
    this.onMessageCallbacks.forEach(callback => {
      callback(topic, message);
    });
  }
}

export default new MQTTService();

