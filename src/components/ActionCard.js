import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MQTTService from '../services/MQTTService';

const ActionCard = ({ action, onEdit, onDelete, isMultiColumn = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRef = useRef(null);

  const executeAction = async (payload = null) => {
    try {
      if (!MQTTService.isConnected) {
        Alert.alert('Erro', 'Não conectado ao broker MQTT');
        return;
      }

      // Usa payload específico ou payload padrão da ação
      const payloadToSend = payload || action.payload;

      await MQTTService.publish(action.topic, payloadToSend);
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
    if (!showMenu) {
      // Calcular posição do botão antes de mostrar o modal
      if (menuButtonRef.current) {
        menuButtonRef.current.measure((fx, fy, width, height, px, py) => {
          setMenuPosition({
            x: px - 120, // Posicionar o modal à esquerda do botão
            y: py + height + 5, // Posicionar abaixo do botão com um pequeno espaçamento
          });
          setShowMenu(true);
        });
      }
    } else {
      setShowMenu(false);
    }
  };

  return (
    <View style={[styles.container, isMultiColumn && styles.multiColumnContainer]}>
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: `${action.iconColor || '#4CAF50'}20` }
        ]}>
          <Ionicons name={action.icon || 'flash'} size={isMultiColumn ? 22 : 24} color={action.iconColor || '#4CAF50'} />
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
          <TouchableOpacity
            ref={menuButtonRef}
            style={styles.menuButton}
            onPress={toggleMenu}
          >
            <Ionicons name="ellipsis-vertical" size={isMultiColumn ? 18 : 20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Botões de execução */}
      {action.payloads && action.payloads.length > 0 ? (
        // Múltiplos botões para múltiplos payloads
        <View style={styles.multipleActionsContainer}>
          {action.payloads.map((payload) => (
            <TouchableOpacity
              key={payload.id}
              style={[styles.executeButton, styles.multipleActionButton, isMultiColumn && styles.multiColumnExecuteButton]}
              onPress={() => executeAction(payload.value)}
            >
              <Text style={[styles.executeButtonText, isMultiColumn && styles.multiColumnExecuteButtonText]}>
                {payload.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Botão único para payload simples
        <TouchableOpacity style={[styles.executeButton, isMultiColumn && styles.multiColumnExecuteButton]} onPress={() => executeAction()}>
          <Text style={[styles.executeButtonText, isMultiColumn && styles.multiColumnExecuteButtonText]}>
            Executar
          </Text>
        </TouchableOpacity>
      )}

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
          <View style={[
            styles.menuContainer,
            {
              position: 'absolute',
              left: menuPosition.x,
              top: menuPosition.y,
            }
          ]}>
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
    marginTop: 12,
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
    marginTop: 8,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#8E8E93',
  },
  multiColumnExecuteButton: {
    paddingVertical: 8,
  },
  executeButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: 'bold',
  },
  multiColumnExecuteButtonText: {
    fontSize: 15,
  },
  multipleActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multipleActionButton: {
    flex: 1,
    minWidth: '45%',
  },
});

export default ActionCard;
