import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import AddActionScreen from './src/screens/AddActionScreen';
import MQTTSettingsScreen from './src/screens/MQTTSettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="AddAction"
            component={AddActionScreen}
            options={{
              headerShown: true,
              title: 'Nova Ação',
              headerStyle: {
                backgroundColor: '#8E8E93',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen
            name="MQTTSettings"
            component={MQTTSettingsScreen}
            options={{
              headerShown: true,
              title: 'Configurações MQTT',
              headerStyle: {
                backgroundColor: '#8E8E93',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


