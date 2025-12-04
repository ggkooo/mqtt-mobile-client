import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIONS_KEY = 'iot_actions';
const LAYOUT_PREFERENCE_KEY = 'layout_preference';

class StorageService {
  async saveActions(actions) {
    try {
      await AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
    } catch (error) {
      throw error;
    }
  }

  async loadActions() {
    try {
      const actionsJson = await AsyncStorage.getItem(ACTIONS_KEY);
      return actionsJson ? JSON.parse(actionsJson) : [];
    } catch (error) {
      return [];
    }
  }

  async addAction(action) {
    try {
      const actions = await this.loadActions();
      const newAction = {
        id: Date.now().toString(),
        ...action,
        createdAt: new Date().toISOString(),
      };
      actions.push(newAction);
      await this.saveActions(actions);
      return newAction;
    } catch (error) {
      throw error;
    }
  }

  async updateAction(actionId, updates) {
    try {
      const actions = await this.loadActions();
      const index = actions.findIndex(action => action.id === actionId);
      if (index !== -1) {
        actions[index] = { ...actions[index], ...updates, updatedAt: new Date().toISOString() };
        await this.saveActions(actions);
        return actions[index];
      }
      throw new Error('Ação não encontrada');
    } catch (error) {
      throw error;
    }
  }

  async deleteAction(actionId) {
    try {
      const actions = await this.loadActions();
      const filteredActions = actions.filter(action => action.id !== actionId);
      await this.saveActions(filteredActions);
    } catch (error) {
      throw error;
    }
  }

  async clearAllActions() {
    try {
      await AsyncStorage.removeItem(ACTIONS_KEY);
    } catch (error) {
      throw error;
    }
  }

  async saveLayoutPreference(numColumns) {
    try {
      await AsyncStorage.setItem(LAYOUT_PREFERENCE_KEY, JSON.stringify(numColumns));
    } catch (error) {
      throw error;
    }
  }

  async loadLayoutPreference() {
    try {
      const preference = await AsyncStorage.getItem(LAYOUT_PREFERENCE_KEY);
      return preference ? JSON.parse(preference) : 1;
    } catch (error) {
      return 1;
    }
  }
}

export default new StorageService();
