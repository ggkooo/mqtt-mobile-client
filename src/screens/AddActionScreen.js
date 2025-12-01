import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../services/StorageService';

const ICON_OPTIONS = [
  { name: 'flash', label: 'Raio' },
  { name: 'bulb', label: 'Lâmpada' },
  { name: 'home', label: 'Casa' },
  { name: 'thermometer', label: 'Temperatura' },
  { name: 'water', label: 'Água' },
  { name: 'car', label: 'Carro' },
  { name: 'camera', label: 'Câmera' },
  { name: 'tv', label: 'TV' },
  { name: 'musical-notes', label: 'Som' },
  { name: 'lock-closed', label: 'Tranca' },
];

const AddActionScreen = ({ navigation, route }) => {
  const isEditing = route.params?.isEditing || false;
  const editingAction = route.params?.action || null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    topic: '',
    payload: '',
    icon: 'flash',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && editingAction) {
      setFormData({
        name: editingAction.name || '',
        description: editingAction.description || '',
        topic: editingAction.topic || '',
        payload: editingAction.payload || '',
        icon: editingAction.icon || 'flash',
      });

      navigation.setOptions({
        title: 'Editar Ação',
      });
    } else {
      navigation.setOptions({
        title: 'Nova Ação',
      });
    }
  }, [isEditing, editingAction, navigation]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Nome da ação é obrigatório');
      return false;
    }
    if (!formData.topic.trim()) {
      Alert.alert('Erro', 'Tópico MQTT é obrigatório');
      return false;
    }
    if (!formData.payload.trim()) {
      Alert.alert('Erro', 'Payload é obrigatório');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isEditing) {
        await StorageService.updateAction(editingAction.id, formData);
        Alert.alert('Sucesso', 'Ação atualizada com sucesso!');
      } else {
        await StorageService.addAction(formData);
        Alert.alert('Sucesso', 'Ação criada com sucesso!');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar ação');
    } finally {
      setSaving(false);
    }
  };

  const renderIconOption = (iconOption) => (
    <TouchableOpacity
      key={iconOption.name}
      style={[
        styles.iconOption,
        formData.icon === iconOption.name && styles.selectedIconOption,
      ]}
      onPress={() => handleInputChange('icon', iconOption.name)}
    >
      <Ionicons
        name={iconOption.name}
        size={24}
        color={formData.icon === iconOption.name ? '#2196F3' : '#666'}
      />
      <Text style={[
        styles.iconLabel,
        formData.icon === iconOption.name && styles.selectedIconLabel,
      ]}>
        {iconOption.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Nome da ação */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Ação *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Ex: Acender luz do quarto"
              placeholderTextColor="#999"
            />
          </View>

          {/* Descrição */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Descrição opcional da ação"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Tópico MQTT */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tópico MQTT *</Text>
            <TextInput
              style={styles.input}
              value={formData.topic}
              onChangeText={(value) => handleInputChange('topic', value)}
              placeholder="Ex: casa/quarto/luz"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Payload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payload *</Text>
            <TextInput
              style={styles.input}
              value={formData.payload}
              onChangeText={(value) => handleInputChange('payload', value)}
              placeholder="Ex: ON, OFF, 1, 0, etc."
              placeholderTextColor="#999"
            />
          </View>

          {/* Seleção de ícone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ícone</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(renderIconOption)}
            </View>
          </View>

          {/* Preview da ação */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Visualização</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIconContainer}>
                  <Ionicons name={formData.icon} size={24} color="#4CAF50" />
                </View>
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>
                    {formData.name || 'Nome da Ação'}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {formData.description || formData.topic || 'Tópico MQTT'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botões de ação */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
          </Text>
        </TouchableOpacity>
      </View>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconOption: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedIconOption: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  iconLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedIconLabel: {
    color: '#2196F3',
    fontWeight: '600',
  },
  previewSection: {
    marginTop: 20,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewCard: {
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
    elevation: 5,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default AddActionScreen;
