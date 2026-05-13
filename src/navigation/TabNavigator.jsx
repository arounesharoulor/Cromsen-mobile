import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { View, StyleSheet, Platform, Text, Dimensions, TouchableOpacity } from 'react-native';
import { Home, UserCircle } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { CategoryIcon, CartIcon } from '../components/CustomIcons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const Tab = createMaterialTopTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.floatingBar, { backgroundColor: theme.surface }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? theme.secondary : theme.textSecondary;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            {options.tabBarIcon && options.tabBarIcon({ color, focused: isFocused })}
            <Text style={[styles.tabLabel, { color }]}>
              {options.tabBarLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  const { cartCount } = useCart();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ swipeEnabled: true }}
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
                <View style={[styles.badge, { backgroundColor: theme.secondary, borderColor: theme.surface }]}>
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
  floatingBar: {
    position: 'absolute',
    flexDirection: 'row',
    bottom: 20,
    left: (width - 338) / 2,
    width: 338,
    height: 56,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  badgeTxt: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
});
