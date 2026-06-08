import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';

interface SettingRowProps {
  label: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
}

function SettingRow({ label, value, isToggle, toggleValue, onToggle, onPress }: SettingRowProps) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surfaceLight, true: Colors.green }}
          thumbColor={Colors.text}
        />
      ) : (
        <Text style={styles.rowValue}>{value ?? '→'}</Text>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function SettingsScreen() {
  const [useMockData, setUseMockData] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [haptics, setHaptics] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <SectionHeader title="DATA SOURCE" />
        <View style={styles.card}>
          <SettingRow
            label="Use Mock Data"
            isToggle
            toggleValue={useMockData}
            onToggle={setUseMockData}
          />
          <View style={styles.separator} />
          <SettingRow label="Garmin Account" value="Not connected" />
          <View style={styles.separator} />
          <SettingRow label="Sync Frequency" value="Every 15 min" />
        </View>

        <SectionHeader title="PREFERENCES" />
        <View style={styles.card}>
          <SettingRow
            label="Push Notifications"
            isToggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <View style={styles.separator} />
          <SettingRow
            label="Haptic Feedback"
            isToggle
            toggleValue={haptics}
            onToggle={setHaptics}
          />
          <View style={styles.separator} />
          <SettingRow label="Units" value="Metric" />
        </View>

        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          <SettingRow label="Version" value="1.0.0" />
          <View style={styles.separator} />
          <SettingRow label="Data powered by" value="Garmin Connect" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    minHeight: 48,
  },
  rowLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  rowValue: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.surfaceLight,
    marginLeft: Spacing.md,
  },
});
