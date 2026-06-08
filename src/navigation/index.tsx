import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { HeartRateScreen } from '../screens/HeartRateScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors, FontSize } from '../theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Heart Rate': '❤️',
    Sleep: '🌙',
    Activities: '🏃',
    Settings: '⚙️',
  };
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.icon, focused && styles.iconFocused]}>
        <View>
          {/* Using emoji as placeholder — will replace with proper SVG icons */}
        </View>
      </View>
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.green,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen name="Heart Rate" component={HeartRateScreen} />
        <Tab.Screen name="Sleep" component={SleepScreen} />
        <Tab.Screen name="Activities" component={ActivitiesScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.surfaceLight,
    borderTopWidth: 0.5,
    paddingTop: 4,
    height: 85,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    opacity: 1,
  },
});
