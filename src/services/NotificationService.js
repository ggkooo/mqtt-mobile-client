import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    // Configurar como as notificações devem ser tratadas quando a app estiver em foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  // Solicitar permissões de notificação
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permissão de notificação negada');
        return false;
      }

      // Configuração específica para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8E8E93',
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões de notificação:', error);
      return false;
    }
  }

  // Enviar notificação local quando uma ação for executada
  async sendActionNotification(actionName, success = true) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Sem permissão para enviar notificações');
        return;
      }

      const title = success ? 'Ação Executada!' : 'Falha na Execução';
      const body = success
        ? `A ação "${actionName}" foi executada com sucesso.`
        : `Falha ao executar a ação "${actionName}".`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#8E8E93',
          icon: './assets/notification-logo.png', // Logo personalizada do app
        },
        trigger: null, // Enviar imediatamente
      });

      console.log(`Notificação enviada: ${title} - ${body}`);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  }

  // Enviar notificação de erro de conexão MQTT
  async sendMQTTNotification(isConnected, errorMessage = null) {
    try {
      // Só enviar notificação em caso de erro/desconexão
      if (isConnected) {
        return; // Não notificar conexões bem-sucedidas
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Sem permissão para enviar notificações');
        return;
      }

      const title = 'Erro de Conexão MQTT';
      let body = 'Não foi possível conectar ao broker MQTT. Verifique suas configurações.';

      // Se há uma mensagem de erro específica, usa ela
      if (errorMessage && typeof errorMessage === 'string') {
        body = errorMessage.length > 100
          ? errorMessage.substring(0, 97) + '...'
          : errorMessage;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          color: '#8E8E93',
          icon: './assets/notification-logo.png', // Logo personalizada do app
        },
        trigger: null,
      });

      console.log(`Notificação MQTT enviada: ${title} - ${body}`);
    } catch (error) {
      console.error('Erro ao enviar notificação MQTT:', error);
    }
  }

  // Cancelar todas as notificações
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Todas as notificações canceladas');
    } catch (error) {
      console.error('Erro ao cancelar notificações:', error);
    }
  }

  // Obter badge count (apenas iOS)
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  // Definir badge count (apenas iOS)
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }
}

// Exportar instância singleton
export default new NotificationService();
