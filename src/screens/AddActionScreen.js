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

const COLOR_OPTIONS = [
  { color: '#4CAF50', label: 'Verde' },
  { color: '#2196F3', label: 'Azul' },
  { color: '#FF9800', label: 'Laranja' },
  { color: '#F44336', label: 'Vermelho' },
  { color: '#9C27B0', label: 'Roxo' },
  { color: '#607D8B', label: 'Azul Acinzentado' },
  { color: '#795548', label: 'Marrom' },
  { color: '#FFC107', label: 'Amarelo' },
  { color: '#E91E63', label: 'Rosa' },
  { color: '#00BCD4', label: 'Ciano' },
  { color: '#FF5722', label: 'Laranja Escuro' },
  { color: '#3F51B5', label: 'Índigo' },
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
    iconColor: '#4CAF50', // Verde como padrão
    payloads: [], // Array de múltiplos payloads
  });

  const [saving, setSaving] = useState(false);
  const [newPayloadName, setNewPayloadName] = useState('');
  const [newPayloadValue, setNewPayloadValue] = useState('');
  const [useMultiplePayloads, setUseMultiplePayloads] = useState(false);

  useEffect(() => {
    if (isEditing && editingAction) {
      const hasMultiplePayloads = editingAction.payloads && editingAction.payloads.length > 0;
      setUseMultiplePayloads(hasMultiplePayloads);

      setFormData({
        name: editingAction.name || '',
        description: editingAction.description || '',
        topic: editingAction.topic || '',
        payload: editingAction.payload || '',
        icon: editingAction.icon || 'flash',
        iconColor: editingAction.iconColor || '#4CAF50',
        payloads: editingAction.payloads || [],
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

  const addPayload = () => {
    if (!newPayloadName.trim() || !newPayloadValue.trim()) {
      Alert.alert('Erro', 'Nome e valor do payload são obrigatórios');
      return;
    }

    const newPayload = {
      id: Date.now().toString(),
      name: newPayloadName.trim(),
      value: newPayloadValue.trim(),
    };

    setFormData(prev => ({
      ...prev,
      payloads: [...prev.payloads, newPayload],
    }));

    setNewPayloadName('');
    setNewPayloadValue('');
  };

  const removePayload = (payloadId) => {
    setFormData(prev => ({
      ...prev,
      payloads: prev.payloads.filter(p => p.id !== payloadId),
    }));
  };

  const togglePayloadType = () => {
    setUseMultiplePayloads(prev => {
      const newValue = !prev;

      // Se mudando para payload único, limpa os múltiplos payloads
      if (!newValue) {
        setFormData(prevData => ({
          ...prevData,
          payloads: [],
        }));
      } else {
        // Se mudando para múltiplos, limpa o payload único
        setFormData(prevData => ({
          ...prevData,
          payload: '',
        }));
      }

      return newValue;
    });
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

    if (useMultiplePayloads) {
      if (formData.payloads.length === 0) {
        Alert.alert('Erro', 'Adicione pelo menos um payload');
        return false;
      }
    } else {
      if (!formData.payload.trim()) {
        Alert.alert('Erro', 'Payload é obrigatório');
        return false;
      }
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

  const renderColorOption = (colorOption) => (
    <TouchableOpacity
      key={colorOption.color}
      style={[
        styles.colorOption,
        formData.iconColor === colorOption.color && styles.selectedColorOption,
      ]}
      onPress={() => handleInputChange('iconColor', colorOption.color)}
    >
      <View style={[styles.colorCircle, { backgroundColor: colorOption.color }]}>
        {formData.iconColor === colorOption.color && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </View>
      <Text style={[
        styles.colorLabel,
        formData.iconColor === colorOption.color && styles.selectedColorLabel,
      ]}>
        {colorOption.label}
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

          {/* Tipo de Payload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Configuração de Payload</Text>
            <View style={styles.payloadTypeContainer}>
              <TouchableOpacity
                style={[styles.payloadTypeOption, !useMultiplePayloads && styles.selectedPayloadType]}
                onPress={() => !useMultiplePayloads || togglePayloadType()}
              >
                <Ionicons
                  name={!useMultiplePayloads ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={!useMultiplePayloads ? "#2196F3" : "#999"}
                />
                <Text style={[styles.payloadTypeText, !useMultiplePayloads && styles.selectedPayloadTypeText]}>
                  Payload único
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payloadTypeOption, useMultiplePayloads && styles.selectedPayloadType]}
                onPress={() => useMultiplePayloads || togglePayloadType()}
              >
                <Ionicons
                  name={useMultiplePayloads ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={useMultiplePayloads ? "#2196F3" : "#999"}
                />
                <Text style={[styles.payloadTypeText, useMultiplePayloads && styles.selectedPayloadTypeText]}>
                  Múltiplos payloads
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {useMultiplePayloads
                ? "Para dispositivos com várias opções (ex: Lâmpada ON/OFF/DIMMER)"
                : "Para ações simples com um comando"
              }
            </Text>
          </View>

          {/* Payload Único */}
          {!useMultiplePayloads && (
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
          )}

          {/* Múltiplos Payloads */}
          {useMultiplePayloads && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Múltiplos Payloads *</Text>

              {/* Lista de payloads existentes */}
              {formData.payloads.map((payload) => (
                <View key={payload.id} style={styles.payloadItem}>
                  <View style={styles.payloadInfo}>
                    <Text style={styles.payloadName}>{payload.name}</Text>
                    <Text style={styles.payloadValue}>{payload.value}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removePayloadButton}
                    onPress={() => removePayload(payload.id)}
                  >
                    <Ionicons name="trash" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Formulário para adicionar novo payload */}
              <View style={styles.addPayloadForm}>
                <View style={styles.payloadInputRow}>
                  <TextInput
                    style={[styles.input, styles.payloadNameInput]}
                    value={newPayloadName}
                    onChangeText={setNewPayloadName}
                    placeholder="Nome (ex: Ligar)"
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.input, styles.payloadValueInput]}
                    value={newPayloadValue}
                    onChangeText={setNewPayloadValue}
                    placeholder="Valor (ex: ON)"
                    placeholderTextColor="#999"
                  />
                </View>
                <TouchableOpacity
                  style={styles.addPayloadButton}
                  onPress={addPayload}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addPayloadButtonText}>Adicionar Payload</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Seleção de ícone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ícone</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(renderIconOption)}
            </View>
          </View>

          {/* Seleção de cor do ícone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cor do Ícone</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(renderColorOption)}
            </View>
          </View>

          {/* Preview da ação */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Visualização</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIconContainer}>
                  <Ionicons name={formData.icon} size={24} color={formData.iconColor} />
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  payloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  payloadInfo: {
    flex: 1,
  },
  payloadName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  payloadValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  removePayloadButton: {
    padding: 8,
    borderRadius: 16,
  },
  addPayloadForm: {
    marginTop: 16,
  },
  payloadInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payloadNameInput: {
    flex: 1,
    marginRight: 8,
  },
  payloadValueInput: {
    flex: 1,
  },
  addPayloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addPayloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  payloadTypeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  payloadTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  selectedPayloadType: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  payloadTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  selectedPayloadTypeText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  colorOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    width: '23%',
    marginBottom: 12,
  },
  selectedColorOption: {
    backgroundColor: '#f0f8ff',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 12,
    height: 24,
    width: '100%',
  },
  selectedColorLabel: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default AddActionScreen;
