import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '../components/ActionCard';
import StorageService from '../services/StorageService';
import MQTTService from '../services/MQTTService';

const HomeScreen = ({ navigation }) => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [numColumns, setNumColumns] = useState(1);
  const [logoError, setLogoError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadActions();
      loadLayoutPreference();
      checkMQTTConnection();
    }, [])
  );

  const loadActions = async () => {
    try {
      setLoading(true);
      const savedActions = await StorageService.loadActions();
      setActions(savedActions);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar ações salvas');
    } finally {
      setLoading(false);
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

  const connectToMQTT = () => {
    navigation.navigate('MQTTSettings');
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {!logoError ? (
          <Image
            source={require('../../assets/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Text style={styles.headerTitle}>Controle IoT</Text>
        )}
      </View>

      {/* Lista de ações */}
      <FlatList
        data={actions}
        renderItem={renderAction}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render when columns change
        contentContainerStyle={[
          numColumns > 1 ? styles.listContainerMultiColumn : styles.listContainer,
          actions.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadActions} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={numColumns > 1 ? styles.row : null}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logo: {
    height: 75,
    width: 75,
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
  listContainer: {
    padding: 20,
  },
  listContainerMultiColumn: {
    padding: 12,
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
});

export default HomeScreen;
