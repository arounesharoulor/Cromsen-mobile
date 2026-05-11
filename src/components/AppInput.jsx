import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME_COLORS } from '../styling';

const AppInput = forwardRef(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  ...props
}, ref) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[styles.input, leftIcon && styles.inputWithLeft, rightIcon && styles.inputWithRight, inputStyle]}
          placeholderTextColor={THEME_COLORS.textSecondary}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
});

export default AppInput;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  inputWrapError: {
    borderColor: THEME_COLORS.error,
  },
  leftIcon: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  rightIcon: {
    paddingRight: 14,
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME_COLORS.text,
    fontWeight: '500',
  },
  inputWithLeft: { paddingLeft: 4 },
  inputWithRight: { paddingRight: 4 },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: THEME_COLORS.error,
    fontWeight: '600',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: THEME_COLORS.textSecondary,
  },
});
