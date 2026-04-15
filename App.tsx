/**
 * ArogyaNetra AI - Root Application
 * Contactless, smartphone-native, multi-disease AI screening system
 *
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/theme';
import { useAppStore } from './src/store/useAppStore';

function App(): React.JSX.Element {
  const { loadPersistedData, initializeDefaultUser } = useAppStore();

  useEffect(() => {
    // Load persisted data from AsyncStorage on app start
    loadPersistedData().then(() => {
      initializeDefaultUser();
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
          translucent={false}
        />
        <View style={styles.container}>
          <AppNavigator />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default App;
