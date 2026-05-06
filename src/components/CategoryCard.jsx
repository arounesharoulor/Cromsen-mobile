import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { getImageUrl, sanitizeData } from '../services/api';

export default function CategoryCard({ category, onPress, isActive }) {
  const name = sanitizeData(category?.name || category?.label, 'Category');
  const image = category?.image ? getImageUrl(category.image) : null;
  const emoji = category?.emoji || '📦';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.imgBox, isActive && styles.imgBoxActive]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    height: 131,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 14,
    gap: 3,
  },
  imgBox: {
    width: 110,
    height: 104,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imgBoxActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 32 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  labelActive: { fontWeight: '900' },
});
