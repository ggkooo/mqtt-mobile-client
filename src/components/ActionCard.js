import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MQTTService from '../services/MQTTService';

const ActionCard = ({ action, onEdit, onDelete, isMultiColumn = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const executeAction = async () => {
    try {
      if (!MQTTService.isConnected) {
        Alert.alert('Erro', 'Não conectado ao broker MQTT');
        return;
      }

      await MQTTService.publish(action.topic, action.payload);
      Alert.alert('Sucesso', `Ação "${action.name}" executada com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', `Falha ao executar ação: ${error.message}`);
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a ação "${action.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDelete(action.id) }
      ]
    );
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(action);
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  return (
    <View style={[styles.container, isMultiColumn && styles.multiColumnContainer]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={action.icon || 'flash'} size={isMultiColumn ? 22 : 24} color="#4CAF50" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, isMultiColumn && styles.multiColumnTitle]} numberOfLines={isMultiColumn ? 3 : 1}>
            {action.name}
          </Text>
          <Text style={[styles.subtitle, isMultiColumn && styles.multiColumnSubtitle]} numberOfLines={1}>
            {action.description || action.topic}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Ionicons name="ellipsis-vertical" size={isMultiColumn ? 18 : 20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.executeButton, isMultiColumn && styles.multiColumnExecuteButton]} onPress={executeAction}>
        <Text style={[styles.executeButtonText, isMultiColumn && styles.multiColumnExecuteButtonText]}>
          Executar
        </Text>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="pencil" size={20} color="#8E8E93" />
              <Text style={styles.menuItemText}>Editar</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="#FF6B6B" />
              <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  multiColumnContainer: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  multiColumnTitle: {
    fontSize: 15,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  multiColumnSubtitle: {
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  executeButton: {
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  multiColumnExecuteButton: {
    paddingVertical: 8,
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  multiColumnExecuteButtonText: {
    fontSize: 15,
  },
});

export default ActionCard;
