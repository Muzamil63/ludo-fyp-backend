// App entry: safe-area + login state + notifications + navigation.
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { colors } from './src/theme';

// Dark navigation theme so screen transitions never flash white
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.gold } };

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AuthProvider>
        <NavigationContainer ref={navigationRef} theme={theme}>
          <NotificationProvider>
            <AppNavigator />
          </NotificationProvider>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
