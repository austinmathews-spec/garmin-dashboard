import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, FontSize } from '../theme';

export function HeartRateScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.placeholder}>Heart Rate Screen — build in progress</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  placeholder: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', marginTop: 100 },
});
