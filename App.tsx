import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation';
import { DataSourceProvider } from './src/utils/DataSourceContext';
import { LockScreen } from './src/screens/LockScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <DataSourceProvider>
        <StatusBar style="dark" />
        {unlocked ? (
          <AppNavigator />
        ) : (
          <LockScreen onUnlock={() => setUnlocked(true)} />
        )}
      </DataSourceProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
