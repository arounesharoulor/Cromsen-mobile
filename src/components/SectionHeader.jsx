import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME_COLORS } from '../theme';

export default function SectionHeader({ title, onSeeAll, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME_COLORS.text,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.primary,
  },
});
