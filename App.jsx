import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Animated, Platform, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const CR_APP_THEME = {
  primary: '#004694',
  secondary: '#F26522',
  cartBtn: '#FCD7CF',
  darkNavy: '#0C1821',
  background: '#EFF1F3',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#4F4F4F',
  border: '#E0E0E0',
  error: '#FF3B30',
  success: '#34C759',
};
const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const FONTS = { bold: '700', semiBold: '600', medium: '500', regular: '400', family: 'Plus Jakarta Sans' };


// Global exports
global.CR_APP_THEME = CR_APP_THEME;
global.THEME_COLORS = CR_APP_THEME;
global.COLORS = CR_APP_THEME;
global.SPACING = SPACING;
global.FONTS = FONTS;

const THEME_COLORS = CR_APP_THEME;

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import SearchScreen from './src/screens/SearchScreen';
import AllProductsScreen from './src/screens/AllProductsScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HelpScreen from './src/screens/HelpScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import TabNavigator from './src/navigation/TabNavigator';

// Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { user, loading } = useAuth();
  const { isDarkMode, theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Addresses" component={AddressesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="AllProducts" component={AllProductsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isDarkMode } = useTheme();
  const { toast, getIcon, getBgColor, toastOpacity, toastY } = useNotifications();

  // Warm up the Render backend in the background on startup
  useEffect(() => {
    console.log('[Wakeup] Pinging Render backend in background to warm up instance...');
    fetch('https://cromsen-backend.onrender.com/api/users').catch(err => {
      console.log('[Wakeup] Background warm-up ping logged:', err.message);
    });

    // Install a global JS error handler to prevent uncaught red-screen crashes
    try {
      if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
        const prevHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((error, isFatal) => {
          console.error('[GlobalError]', error, isFatal);
          try {
            Alert.alert('Unexpected error', 'An unexpected error occurred. Please restart the app.');
          } catch (e) {}
          if (typeof prevHandler === 'function') {
            // Don't rethrow - keep app alive; but still call previous handler for logs
            try { prevHandler(error, isFatal); } catch (e) {}
          }
        });
      }
    } catch (e) {
      console.warn('Failed to set global error handler', e);
    }
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Navigation />
      
      {toast && (
        <Animated.View 
          style={[
            styles.globalToastContainer, 
            { 
              opacity: toastOpacity,
              transform: [{ translateY: toastY }],
              backgroundColor: getBgColor(toast.type)
            }
          ]}
        >
          <View style={styles.globalToastIcon}>
            {getIcon(toast.type)}
          </View>
          <Text style={styles.globalToastText} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <WishlistProvider>
                <AppContent />
              </WishlistProvider>
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  globalToastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 9999, // Ensure top-priority overlay on Android
    zIndex: 999999,  // Ensure top-priority overlay on iOS
  },
  globalToastIcon: {
    marginRight: 12,
  },
  globalToastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    lineHeight: 20,
  },
});
