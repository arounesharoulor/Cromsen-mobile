import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS } from '../theme';

export const CustomButton = ({ title, onPress, loading, variant = 'primary', style }) => {
  const isSecondary = variant === 'secondary';
  
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        isSecondary ? styles.buttonSecondary : styles.buttonPrimary,
        style
      ]} 
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? COLORS.primary : '#FFFFFF'} />
      ) : (
        <Text style={[
          styles.text, 
          isSecondary ? styles.textSecondary : styles.textPrimary
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  text: {
    fontSize: 16,
    fontWeight: FONTS.semiBold,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: COLORS.primary,
  },
});
