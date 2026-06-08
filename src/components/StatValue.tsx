import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../theme';

interface StatValueProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatValue({ label, value, unit, color, size = 'md' }: StatValueProps) {
  const valueFontSize =
    size === 'lg' ? FontSize.xxl : size === 'sm' ? FontSize.lg : FontSize.xl;

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: valueFontSize, color: color ?? Colors.text }]}>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    color: Colors.text,
    fontWeight: '700',
  },
  unit: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
