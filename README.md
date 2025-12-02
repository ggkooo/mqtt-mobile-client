# MQTT Mobile Client

Um cliente MQTT moderno e intuitivo desenvolvido em React Native para controle de dispositivos IoT.

## 📱 Funcionalidades

- **Conexão MQTT Automática**: Conecta automaticamente ao broker na inicialização
- **Protocolo Personalizável**: Escolha entre WebSocket (ws://) e WebSocket Seguro (wss://)
- **Ações IoT**: Crie, edite e execute ações personalizadas para seus dispositivos
- **Interface Intuitiva**: Design moderno com status visual da conexão
- **Reconexão Automática**: Detecta perda de conexão e reconecta automaticamente
- **Autenticação**: Suporte a username/password para brokers seguros

## 🚀 Tecnologias

- **React Native** com Expo
- **AsyncStorage** para persistência local
- **WebSocket** para conexão MQTT
- **React Navigation** para navegação entre telas

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Expo CLI
- Broker MQTT configurado com WebSocket

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITORIO]
cd mqtt-mobile-client
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o projeto:
```bash
npx expo start
```

## ⚙️ Configuração

### Broker MQTT

1. Acesse a tela de configurações MQTT no app
2. Configure:
   - **Host**: Endereço do seu broker
   - **Porta**: Porta WebSocket do broker (ex: 8080, 9001, 8083)
   - **Protocolo**: ws:// (não seguro) ou wss:// (seguro)
   - **Autenticação**: Username/password se necessário

### Exemplos de Configuração

#### Desenvolvimento Local
- Host: `localhost`
- Porta: `9001`
- Protocolo: `ws://`

#### Produção
- Host: `seu-broker.com`
- Porta: `8083`
- Protocolo: `wss://`

## 🎯 Como Usar

1. **Primeira Execução**: Configure a conexão MQTT
2. **Ações IoT**: Crie ações para controlar seus dispositivos
3. **Execução**: Toque nas ações para enviar comandos via MQTT
4. **Monitoramento**: Visualize o status da conexão em tempo real

## 📁 Estrutura do Projeto

```
src/
├── components/
│   └── ActionCard.js          # Componente de ação IoT
├── screens/
│   ├── HomeScreen.js          # Tela principal
│   ├── AddActionScreen.js     # Criação/edição de ações
│   └── MQTTSettingsScreen.js  # Configurações MQTT
├── services/
│   ├── MQTTService.js         # Serviço de conexão MQTT
│   └── StorageService.js      # Persistência local
└── utils/                     # Utilitários diversos
```

## 🔗 Compatibilidade

### Brokers Testados
- **Mosquitto** (com WebSocket habilitado)
- **HiveMQ Cloud**
- **EMQX**
- **AWS IoT Core**

### Plataformas
- iOS
- Android

## 🛠️ Desenvolvimento

### Scripts Disponíveis
- `npm start` - Inicia o Expo
- `npm run android` - Executa no Android
- `npm run ios` - Executa no iOS

### Arquitetura
O app utiliza uma arquitetura baseada em serviços:
- **MQTTService**: Gerencia conexões WebSocket e protocolo MQTT
- **StorageService**: Persistência de dados local
- **ActionCard**: Componente reutilizável para ações IoT

## 🔧 Configuração do Broker

Para usar com Mosquitto, adicione ao `mosquitto.conf`:

```conf
# WebSocket
listener 9001
protocol websockets

# WebSocket Seguro (SSL)
listener 8083
protocol websockets
certfile /path/to/cert.pem
keyfile /path/to/key.pem
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License.

## 📞 Suporte

Para dúvidas ou suporte, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando React Native**

## Instalação e Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar no simulador
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios
```

## Dependências Principais

- **React Navigation**: Navegação entre telas
- **Expo Vector Icons**: Ícones da interface
- **AsyncStorage**: Armazenamento local
- **Paho MQTT**: Cliente MQTT para React Native

## Estrutura do Projeto

```
src/
├── components/
│   └── ActionCard.js          # Componente de cartão de ação
├── screens/
│   ├── HomeScreen.js          # Tela principal
│   ├── AddActionScreen.js     # Tela de adicionar/editar ação
│   └── MQTTSettingsScreen.js  # Tela de configurações MQTT
├── services/
│   ├── MQTTService.js         # Serviço de comunicação MQTT
│   └── StorageService.js      # Serviço de armazenamento local
└── utils/
```

## Dicas

1. **Teste de Conexão**: Use a função "Testar" na tela de configurações para verificar se a conexão MQTT está funcionando
2. **Brokers Locais**: Para usar brokers locais, certifique-se de que suportam WebSocket na porta configurada
3. **Organização**: Use uma convenção de nomenclatura consistente para tópicos (ex: `casa/comodo/dispositivo`)
4. **Backup**: As ações são salvas localmente, mas considere exportar configurações importantes
5. **Segurança**: Para ambientes de produção, use brokers com autenticação e SSL

## Solução de Problemas

- **Erro de Conexão**: Verifique se o broker e porta estão corretos e acessíveis
- **Comandos não funcionam**: Confirme se os tópicos e payloads estão corretos para seu dispositivo
- **App não conecta**: Verifique sua conexão com a internet e configurações do firewall
