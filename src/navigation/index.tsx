import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { HeartRateScreen } from '../screens/HeartRateScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors, FontSize, Spacing } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  'Heart Rate': '❤️',
  Sleep: '🌙',
  Activities: '🏃',
  Settings: '⚙️',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>
        {TAB_ICONS[label] ?? '•'}
      </Text>
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.green,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
          tabBarItemStyle: styles.tabItem,
        })}
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    height: 88,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    paddingTop: Spacing.xs,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  iconText: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});
