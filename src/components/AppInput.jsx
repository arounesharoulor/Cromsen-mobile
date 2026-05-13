import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: theme.text }]}>{label}</Text>}

      <View style={[
        styles.inputWrap, 
        { borderColor: theme.border, backgroundColor: theme.input },
        error && { borderColor: theme.error }
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[
            styles.input, 
            { color: theme.text },
            leftIcon && styles.inputWithLeft, 
            rightIcon && styles.inputWithRight, 
            inputStyle
          ]}
          placeholderTextColor={theme.textSecondary}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
      {!error && hint && <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>}
    </View>
  );
});

export default AppInput;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    minHeight: 48,
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
    fontWeight: '500',
  },
  inputWithLeft: { paddingLeft: 4 },
  inputWithRight: { paddingRight: 4 },
  error: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
  },
});
