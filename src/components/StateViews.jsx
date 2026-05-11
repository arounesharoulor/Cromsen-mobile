import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { THEME_COLORS } from '../theme';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={THEME_COLORS.primary} />
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <View style={styles.center}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.title}>{message}</Text>
      {onRetry && (
        <Text style={styles.retry} onPress={onRetry}>Try Again</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME_COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: 24 },
  msg: {
    marginTop: 12,
    fontSize: 14,
    color: THEME_COLORS.textSecondary,
    fontWeight: '600',
  },
  retry: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '800',
    color: THEME_COLORS.primary,
    textDecorationLine: 'underline',
  },
});
