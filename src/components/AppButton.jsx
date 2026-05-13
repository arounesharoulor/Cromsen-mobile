import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Primary CTA button. Variants: 'primary' | 'secondary' | 'outline' | 'ghost'
 */
export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) {
  const { theme } = useTheme();

  const btnStyle = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    variant === 'primary' && { backgroundColor: theme.primary, shadowColor: theme.primary },
    variant === 'secondary' && { backgroundColor: theme.secondary, shadowColor: theme.secondary },
    variant === 'outline' && { borderColor: theme.primary },
    (disabled || loading) && styles.disabled,
    style,
  ];
  const txtStyle = [
    styles.baseText,
    styles[`text_${size}`],
    styles[`textVariant_${variant}`],
    (variant === 'outline' || variant === 'ghost') && { color: theme.primary },
    textStyle,
  ];

  return (
    <TouchableOpacity style={btnStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? theme.primary : '#FFF'} />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={txtStyle}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },

  // Sizes
  size_sm: { height: 36, paddingHorizontal: 14 },
  size_md: { height: 48, paddingHorizontal: 20 },
  size_lg: { height: 56, paddingHorizontal: 24 },

  // Variants (Dynamic colors applied in JS)
  variant_primary: {
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  variant_secondary: {
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },

  // Text base
  baseText: { fontWeight: '900' },
  text_sm: { fontSize: 13 },
  text_md: { fontSize: 15 },
  text_lg: { fontSize: 16 },

  textVariant_primary: { color: '#FFFFFF' },
  textVariant_secondary: { color: '#FFFFFF' },
  textVariant_outline: { },
  textVariant_ghost: { },

  disabled: { opacity: 0.5 },
});
