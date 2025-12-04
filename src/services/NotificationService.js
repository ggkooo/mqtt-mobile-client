import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

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
      return false;
    }
  }

  async sendActionNotification(actionName, success = true) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      const title = success ? 'Action Executed!' : 'Execution Failed';
      const body = success
        ? `Action "${actionName}" was executed successfully.`
        : `Failed to execute action "${actionName}".`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#8E8E93',
          icon: './assets/notification-logo.png',
        },
        trigger: null,
      });

    } catch (error) {
      // Silent fail
    }
  }

  async sendMQTTNotification(isConnected, errorMessage = null) {
    try {
      if (isConnected) {
        return;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      const title = 'MQTT Connection Error';
      let body = 'Could not connect to MQTT broker. Check your settings.';

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
          icon: './assets/notification-logo.png',
        },
        trigger: null,
      });

    } catch (error) {
      // Silent fail
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      // Silent fail
    }
  }

  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }

  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }
}

export default new NotificationService();
