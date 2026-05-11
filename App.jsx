import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
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
import TabNavigator from './src/navigation/TabNavigator';

// Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CR_APP_THEME.surface }}>
        <ActivityIndicator size="large" color={CR_APP_THEME.primary} />
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
          <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="AllProducts" component={AllProductsScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <Navigation />
            </NavigationContainer>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
