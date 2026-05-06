import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../theme';

/**
 * Reusable screen header. Matches Figma nav bar spec:
 * height: 150dp, rounded bottom corners: 20dp, white bg, elevation 4
 */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightElement,
  style,
  compact = false,
}) {
  if (compact) {
    return (
      <View style={[styles.compact, style]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.compactTitle}>{title}</Text>
        <View style={styles.rightSlot}>{rightElement || null}</View>
      </View>
    );
  }

  return (
    <View style={[styles.header, style]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <View style={styles.rightSlot}>{rightElement || null}</View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },

  // Compact variant
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
});
