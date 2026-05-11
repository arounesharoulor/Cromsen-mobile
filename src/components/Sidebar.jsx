import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  TouchableWithoutFeedback,
  ScrollView,
  Platform
} from 'react-native';
import { THEME_COLORS, SPACING, FONTS } from '../theme';
import { 
  X, 
  Home, 
  ShoppingBag, 
  User, 
  LogOut,
  ChevronRight,
  Package,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react-native';

import { HeartIcon } from './CustomIcons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export const Sidebar = ({ isOpen, onClose, navigation }) => {
  const { logout: authLogout } = useAuth();
  const [visible, setVisible] = React.useState(isOpen);
  const animation = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isOpen]);

  if (!visible) return null;

  const menuItems = [
    { icon: Home, label: 'Home', screen: 'Main', params: { screen: 'HomeTab' } },
    { icon: ShoppingBag, label: 'My Orders', screen: 'Orders' },
    { icon: HeartIcon, label: 'Wishlist', screen: 'Wishlist' },
    { icon: Bell, label: 'Notifications', screen: 'Profile' },
    { icon: Package, label: 'Cromsen Premium', screen: 'Profile' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings' },
    { icon: HelpCircle, label: 'Support' },
    { icon: LogOut, label: 'Logout', color: THEME_COLORS.error, onPress: authLogout },
  ];

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX: animation }] }]}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.userName}>Arounesh</Text>
              <Text style={styles.userEmail}>arounesh@example.com</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>SHOPPING</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                navigation.navigate(item.screen, item.params);
              }}
            >
              <View style={styles.menuIconContainer}>
                <item.icon color={THEME_COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight color={THEME_COLORS.border} size={16} />
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          {bottomItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (item.onPress) item.onPress();
              }}
            >
              <View style={[styles.menuIconContainer, item.color && { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                <item.icon color={item.color || THEME_COLORS.text} size={20} />
              </View>
              <Text style={[styles.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Cromsen Mobile v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME_COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: THEME_COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME_COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 15,
    marginLeft: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${THEME_COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: THEME_COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: THEME_COLORS.border,
    marginVertical: 25,
    marginHorizontal: 5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  versionText: {
    fontSize: 12,
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
