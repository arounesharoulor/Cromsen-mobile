import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { THEME_COLORS } from '../styling';
import { View, StyleSheet, Platform, Text, Dimensions } from 'react-native';
import { Home, ShoppingCart, UserCircle } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { CategoryIcon, CartIcon } from '../components/CustomIcons';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { cartCount } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME_COLORS.secondary, // Orange for active
        tabBarInactiveTintColor: THEME_COLORS.textSecondary, // Slate for inactive
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: (width - 338) / 2,
          width: 338,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          paddingHorizontal: 10,
          paddingTop: 4,
          paddingBottom: 4,
          elevation: 4,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{
          tabBarLabel: 'Category',
          tabBarIcon: ({ color, focused }) => (
            <CategoryIcon color={color} size={24} />
          ),
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <CartIcon color={color} size={24} />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <UserCircle color={color} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: THEME_COLORS.secondary,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeTxt: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
});
