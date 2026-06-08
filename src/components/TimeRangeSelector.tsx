import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme';
import type { TimeRange } from '../types';

const RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'All'];

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selected, onSelect }: TimeRangeSelectorProps) {
  return (
    <View style={styles.container}>
      {RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.pill, selected === r && styles.pillActive]}
          onPress={() => onSelect(r)}
        >
          <Text style={[styles.pillText, selected === r && styles.pillTextActive]}>
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceLight,
  },
  pillActive: {
    backgroundColor: Colors.green,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.background,
  },
});
