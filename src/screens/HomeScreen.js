import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '../components/ActionCard';
import StorageService from '../services/StorageService';
import MQTTService from '../services/MQTTService';
import NotificationService from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const MQTT_CONFIG_KEY = 'mqtt_config';

// NOTA: Este app possui proteção automática com bloqueio biométrico
// Sempre que o usuário sair do app e voltar, será solicitada autenticação biométrica
// (implementado no AuthContext via AppState listener)

const HomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [mqttConnecting, setMqttConnecting] = useState(false); // Estado para conexão
  const [numColumns, setNumColumns] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('addition'); // 'addition', 'name', 'alphabetic', 'type'
  const [showSortModal, setShowSortModal] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadActions();
      loadLayoutPreference();
      checkMQTTConnection();

      // Sempre tentar conectar automaticamente quando a tela for focada
      attemptAutoConnect();
    }, [])
  );

  const loadActions = async () => {
    try {
      const savedActions = await StorageService.loadActions();
      setActions(savedActions);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar ações salvas');
    }
  };

  const loadLayoutPreference = async () => {
    try {
      const preference = await StorageService.loadLayoutPreference();
      setNumColumns(preference);
    } catch (error) {
      console.log('Erro ao carregar preferência de layout:', error);
    }
  };

  const toggleMenu = async () => {
    if (!showMenu) {
      // Animar rotação ao abrir o menu
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowMenu(true);
    } else {
      // Animar rotação de volta ao fechar o menu
      Animated.timing(rotationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowMenu(false);
    }
  };

  const closeMenu = () => {
    Animated.timing(rotationAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowMenu(false);
  };

  const toggleLayout = async () => {
    try {
      const newNumColumns = numColumns === 1 ? 2 : 1;
      setNumColumns(newNumColumns);
      await StorageService.saveLayoutPreference(newNumColumns);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar preferência de layout');
    }
  };

  const checkMQTTConnection = () => {
    setMqttConnected(MQTTService.isConnected);
  };

  const attemptAutoConnect = async () => {
    try {
      setMqttConnecting(true);

      if (MQTTService.isConnected) {
        setMqttConnected(true);
        setMqttConnecting(false);
        return;
      }

      // Primeiro tenta carregar configuração salva no MQTTService
      const configLoaded = await MQTTService.loadSavedConfig();
      if (!configLoaded) {
        // Se não conseguiu carregar do service, tenta do AsyncStorage local
        const savedConfig = await AsyncStorage.getItem(MQTT_CONFIG_KEY);
        if (!savedConfig) {
          console.log('Nenhuma configuração MQTT encontrada para conexão automática');
          setMqttConnecting(false);
          return;
        }

        const config = JSON.parse(savedConfig);
        if (!config.brokerHost || !config.brokerPort) {
          console.log('Configuração MQTT incompleta');
          setMqttConnecting(false);
          return;
        }

        await MQTTService.connect(
          config.brokerHost,
          parseInt(config.brokerPort),
          config.clientId || null,
          config.useAuth ? config.username : null,
          config.useAuth ? config.password : null,
          {
            forceProtocol: config.protocol
          }
        );
      } else {
        // Se carregou configuração, usa reconexão do service
        await MQTTService.reconnect();
      }

      setMqttConnected(true);
      console.log('Conexão MQTT automática bem-sucedida');

    } catch (error) {
      console.error(`Falha na conexão automática MQTT: ${error.message}`);
      setMqttConnected(false);
      // Enviar notificação apenas em caso de erro
      try {
        await NotificationService.sendMQTTNotification(false, `Erro de conexão: ${error.message}`);
      } catch (notificationError) {
        console.error('Erro ao enviar notificação:', notificationError);
      }
    } finally {
      setMqttConnecting(false);
    }
  };

  // ...existing code...

  useEffect(() => {
    checkMQTTConnection();

    const connectionCheckInterval = setInterval(() => {
      const wasConnected = mqttConnected;
      const isCurrentlyConnected = MQTTService.isConnected;

      if (wasConnected !== isCurrentlyConnected) {
        setMqttConnected(isCurrentlyConnected);

        if (!isCurrentlyConnected && wasConnected) {
          setMqttConnecting(false);

          setTimeout(() => {
            if (!MQTTService.isConnected) {
              attemptReconnect();
            }
          }, 5000);

        } else if (isCurrentlyConnected && !wasConnected) {
          setMqttConnecting(false);
        }
      }
    }, 3000);

    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [mqttConnected]);

  const filteredAndSortedActions = useMemo(() => {
    let filtered = actions.filter(action =>
      (action.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (action.topic || '').toLowerCase().includes(searchText.toLowerCase())
    );

    filtered.sort((a, b) => {
      let result;

      switch (sortOrder) {
        case 'addition':
          const indexA = actions.findIndex(action => action.id === a.id);
          const indexB = actions.findIndex(action => action.id === b.id);
          result = indexB - indexA;
          break;
        case 'alphabetic':
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          result = nameA.localeCompare(nameB);
          break;
        case 'type':
          const typeA = (a.type || '').toLowerCase();
          const typeB = (b.type || '').toLowerCase();
          if (typeA === typeB) {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            result = nameA.localeCompare(nameB);
          } else {
            result = typeA.localeCompare(typeB);
          }
          break;
        default:
          result = 0;
      }

      return isReversed ? -result : result;
    });

    return filtered;
  }, [actions, searchText, sortOrder, isReversed]);

  const toggleReverse = () => {
    setIsReversed(!isReversed);
  };

  const handleAddAction = () => {
    navigation.navigate('AddAction');
  };

  const handleEditAction = (action) => {
    navigation.navigate('AddAction', { action, isEditing: true });
  };

  const handleDeleteAction = async (actionId) => {
    try {
      await StorageService.deleteAction(actionId);
      await loadActions();
      Alert.alert('Sucesso', 'Ação excluída com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao excluir ação');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Você tem certeza de que deseja sair do aplicativo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Desconectar MQTT antes de fazer logout
              if (MQTTService.isConnected) {
                MQTTService.disconnect();
              }
              await logout();
            } catch (error) {
              console.error('Erro durante logout:', error);
              Alert.alert('Erro', 'Erro ao sair do aplicativo');
            }
          },
        },
      ]
    );
  };

  const connectToMQTT = () => {
    navigation.navigate('MQTTSettings');
  };

  const attemptReconnect = async () => {
    try {
      setMqttConnecting(true);

      // Primeiro tenta usar reconexão do MQTTService (que carrega configuração automaticamente)
      if (MQTTService.brokerConfig) {
        await MQTTService.reconnect();
      } else {
        // Se não tem configuração no service, carrega e tenta conectar
        const savedConfig = await AsyncStorage.getItem(MQTT_CONFIG_KEY);
        if (!savedConfig) {
          console.log('Sem configuração MQTT salva para reconexão');
          setMqttConnecting(false);
          return;
        }

        const config = JSON.parse(savedConfig);
        if (!config.brokerHost || !config.brokerPort) {
          console.log('Configuração MQTT incompleta para reconexão');
          setMqttConnecting(false);
          return;
        }

        await MQTTService.connect(
          config.brokerHost,
          parseInt(config.brokerPort),
          config.clientId || null,
          config.useAuth ? config.username : null,
          config.useAuth ? config.password : null,
          {
            forceProtocol: config.protocol
          }
        );
      }

      setMqttConnected(true);
      console.log('Reconexão MQTT bem-sucedida');

    } catch (error) {
      console.error(`Falha na reconexão MQTT: ${error.message}`);
      setMqttConnected(false);
      // Enviar notificação apenas em caso de erro de reconexão
      try {
        await NotificationService.sendMQTTNotification(false, `Erro de reconexão: ${error.message}`);
      } catch (notificationError) {
        console.error('Erro ao enviar notificação:', notificationError);
      }
    } finally {
      setMqttConnecting(false);
    }
  };


  const renderAction = ({ item }) => (
    <ActionCard
      action={item}
      onEdit={handleEditAction}
      onDelete={handleDeleteAction}
      isMultiColumn={numColumns > 1}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="home-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Nenhuma ação configurada</Text>
      <Text style={styles.emptySubtitle}>
        Toque no botão + para adicionar sua primeira ação IoT
      </Text>
    </View>
  );

  // Componente de status de conexão MQTT
  const renderMQTTStatus = () => {
    if (mqttConnecting) {
      return (
        <View style={styles.mqttStatusContainer}>
          <View style={styles.mqttStatusCard}>
            <View style={styles.mqttStatusIcon}>
              <Ionicons name="sync" size={24} color="#FF9800" />
            </View>
            <View style={styles.mqttStatusContent}>
              <Text style={styles.mqttStatusTitle}>Conectando ao MQTT...</Text>
              <Text style={styles.mqttStatusSubtitle}>
                Estabelecendo conexão automática com o broker
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!mqttConnected) {
      return (
        <View style={styles.mqttStatusContainer}>
          <TouchableOpacity
            style={styles.mqttStatusCard}
            onPress={connectToMQTT}
            activeOpacity={0.8}
          >
            <View style={styles.mqttStatusIcon}>
              <Ionicons name="cloud-offline-outline" size={24} color="#F44336" />
            </View>
            <View style={styles.mqttStatusContent}>
              <Text style={styles.mqttStatusTitle}>MQTT Desconectado</Text>
              <Text style={styles.mqttStatusSubtitle}>
                Toque aqui para configurar a conexão com o broker
              </Text>
            </View>
            <View style={styles.mqttStatusAction}>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Conectado - mostrar status discreto
    return (
      <View style={styles.mqttStatusContainer}>
        <View style={styles.mqttStatusCardConnected}>
          <View style={styles.mqttStatusIconConnected}>
            <Ionicons name="cloud-done" size={20} color="#4CAF50" />
          </View>
          <Text style={styles.mqttStatusTitleConnected}>MQTT Conectado</Text>
          <TouchableOpacity
            onPress={connectToMQTT}
            style={styles.mqttStatusSettings}
          >
            <Ionicons name="settings-outline" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ações..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="funnel-outline" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.reverseButton,
                isReversed && styles.reverseButtonActive
              ]}
              onPress={toggleReverse}
            >
              <Ionicons
                name={isReversed ? "arrow-down" : "arrow-up"}
                size={20}
                color={isReversed ? "#007AFF" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Status de Conexão MQTT */}
      {renderMQTTStatus()}

      {/* Lista de ações */}
      <FlatList
        data={filteredAndSortedActions}
        renderItem={renderAction}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        contentContainerStyle={[
          numColumns > 1 ? styles.listContainerMultiColumn : styles.listContainer,
          filteredAndSortedActions.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => {
            setLoading(true);
            loadActions().finally(() => setLoading(false));
          }} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={numColumns > 1 ? styles.row : null}
        removeClippedSubviews={false}
        initialNumToRender={10}
      />

      {/* Botão de menu flutuante */}
      <TouchableOpacity
        style={styles.floatingMenuButton}
        onPress={toggleMenu}
      >
        <Animated.View
          style={{
            transform: [{
              rotate: rotationAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              })
            }]
          }}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Modal de Ordenação */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContainer}>
            <Text style={styles.sortModalTitle}>Ordenar por:</Text>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortOrder === 'addition' && styles.sortOptionSelected
              ]}
              onPress={() => {
                setSortOrder('addition');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOrder === 'addition' && styles.sortOptionTextSelected
              ]}>
                Ordem de Adição
              </Text>
              {sortOrder === 'addition' && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortOrder === 'alphabetic' && styles.sortOptionSelected
              ]}
              onPress={() => {
                setSortOrder('alphabetic');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOrder === 'alphabetic' && styles.sortOptionTextSelected
              ]}>
                Ordem Alfabética (A-Z)
              </Text>
              {sortOrder === 'alphabetic' && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortOrder === 'type' && styles.sortOptionSelected
              ]}
              onPress={() => {
                setSortOrder('type');
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOrder === 'type' && styles.sortOptionTextSelected
              ]}>
                Por Tipo
              </Text>
              {sortOrder === 'type' && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenu}
        onRequestClose={closeMenu}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeMenu}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                handleAddAction();
              }}
            >
              <Ionicons name="add-circle" size={24} color="#666" />
              <Text style={styles.menuItemText}>Nova Ação IoT</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                toggleLayout();
              }}
            >
              <Ionicons
                name={numColumns === 1 ? 'grid-outline' : 'list-outline'}
                size={24}
                color="#666"
              />
              <Text style={styles.menuItemText}>
                {numColumns === 1 ? 'Visualização em Grade' : 'Visualização em Lista'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                connectToMQTT();
              }}
            >
              <Ionicons
                name={mqttConnected ? 'wifi' : 'wifi-outline'}
                size={24}
                color={mqttConnected ? '#888' : '#999'}
              />
              <Text style={styles.menuItemText}>
                {mqttConnected ? 'Configurações MQTT' : 'Conectar MQTT'}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => {
                closeMenu();
                handleLogout();
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={24}
                color="#FF3B30"
              />
              <Text style={[styles.menuItemText, styles.logoutText]}>
                Sair
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: 40,
  },
  clearButton: {
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reverseButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  reverseButtonActive: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  sortModalContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingMenuButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8E8E93', // Cinza claro
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 90, // Espaço para ficar acima do botão flutuante
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
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
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  logoutItem: {
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#FF3B30',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  listContainerMultiColumn: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  // Estilos para componente de status MQTT
  mqttStatusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  mqttStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  mqttStatusCardConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fff8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8f5e8',
  },
  mqttStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mqttStatusIconConnected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mqttStatusContent: {
    flex: 1,
  },
  mqttStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  mqttStatusTitleConnected: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  mqttStatusSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  mqttStatusAction: {
    marginLeft: 8,
  },
  mqttStatusSettings: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
});

export default HomeScreen;
