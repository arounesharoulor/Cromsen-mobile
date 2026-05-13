import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar,
  Image, Modal, Alert, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Package, ChevronRight, LogOut,
  MapPin, CreditCard, Bell, HelpCircle, Settings, ShieldCheck,
  Pencil, Code, ArrowRight, ArrowLeft
} from 'lucide-react-native';

import { HeartIcon } from '../components/CustomIcons';
import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { sanitizeData } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

const MENU_SECTIONS = [
  {
    title: 'Orders & Delivery',
    items: [
      { icon: Package, label: 'My orders', screen: 'Orders' },
      { icon: MapPin, label: 'Addresses', screen: 'Addresses' },
    ],

  },
  {
    title: 'Saved & Activity',
    items: [
      { icon: HeartIcon, label: 'My Wishlist', screen: 'Wishlist' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Support & Help', screen: 'Help' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: Settings, label: 'Settings', screen: 'Settings' },
    ],
  },

  {
    title: 'Account',
    items: [
      { icon: LogOut, label: 'Logout', screen: 'LogoutAction' },
    ],
  },
];

export default function ProfileScreen({ navigation }) {
  const { user, logout: authLogout, updateUser } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { isDarkMode, theme } = useTheme();
  const [profileImage, setProfileImage] = useState(user?.image || null);

  React.useEffect(() => {
    if (user?.image) setProfileImage(user.image);
    else loadLocalAvatar();
  }, [user]);

  const loadLocalAvatar = async () => {
    try {
      const stored = await AsyncStorage.getItem('@ProfileImage');
      if (stored) setProfileImage(stored);
    } catch (e) {}
  };

  const saveAvatar = async (uri) => {
    try {
      setProfileImage(uri);
      await AsyncStorage.setItem('@ProfileImage', uri);
      // Also update global auth context
      updateUser({ ...user, image: uri });
    } catch (e) {}
  };

  const [showImageOptions, setShowImageOptions] = useState(false);

  const userName = sanitizeData(user?.name, 'Abishek Kevin');
  const userEmail = user?.email || 'kevin@madhuratechnologies.com';

  const handleRemoveImage = async () => {
    setProfileImage(null);
    await AsyncStorage.removeItem('@ProfileImage');
    updateUser({ ...user, image: null });
    setShowImageOptions(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied", 
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        saveAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image from device.");
    } finally {
      setShowImageOptions(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#F8FAFC' }]}>
          <ArrowLeft size={20} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, { color: theme.primary }]}>Your Account</Text>
        <View style={{ width: 36 }} />
      </View>


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
          <Text style={[styles.cardHeaderTitle, { color: theme.primary }]}>Your Account</Text>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: theme.background, borderColor: theme.surface }]}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <View style={[styles.avatarImg, { backgroundColor: isDarkMode ? '#2C3E50' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <User size={40} color={theme.textSecondary} />
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.surface }]} onPress={() => setShowImageOptions(true)}>
              <Pencil size={12} color="#FFF" />
            </TouchableOpacity>

          </View>

          <Text style={[styles.profileName, { color: theme.text }]}>{userName}</Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{userEmail}</Text>
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.menuRow, ii === section.items.length - 1 && styles.noBorder]}
                  onPress={() => {
                    if (item.screen === 'LogoutAction') authLogout();
                    else if (item.screen) navigation.navigate(item.screen);
                  }}
                   activeOpacity={0.7}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: theme.background }]}>
                    <item.icon size={18} color={theme.text} />
                  </View>
                  <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
                  <ArrowRight size={16} color={theme.text} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: theme.textSecondary, opacity: 0.5 }]}>CROMSEN • v1.0.4</Text>

      </ScrollView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowImageOptions(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Photo</Text>
            <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border }]} onPress={handlePickImage}>
              <Text style={[styles.modalOptionTxt, { color: theme.primary }]}>Change Photo</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity style={[styles.modalOption, { borderBottomColor: theme.border }]} onPress={handleRemoveImage}>
                <Text style={[styles.modalOptionTxt, { color: '#EF4444' }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.modalOption, styles.modalCancel]} onPress={() => setShowImageOptions(false)}>
              <Text style={[styles.modalOptionTxt, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF1F3' },
  scroll: { paddingBottom: 120 },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME_COLORS.primary,
  },

  /* Profile Card */
  profileCard: {
    backgroundColor: THEME_COLORS.surface,
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME_COLORS.primary,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_COLORS.primary,
    marginBottom: 20,
  },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: THEME_COLORS.background,
    overflow: 'hidden',
    borderWidth: 2, borderColor: THEME_COLORS.surface,
  },
  avatarImg: { width: '100%', height: '100%' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME_COLORS.surface,
  },
  profileName: { fontSize: 20, fontWeight: '900', color: THEME_COLORS.text, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: THEME_COLORS.textSecondary, fontWeight: '500' },

  /* Sections */
  section: { paddingHorizontal: 20, marginTop: 15 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#64748B',
    letterSpacing: 1.0, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    gap: 14,
  },
  noBorder: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#000' },

  version: {
    textAlign: 'center', fontSize: 11, fontWeight: '700',
    color: '#CBD5E1', letterSpacing: 2, marginTop: 30,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalOptionTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME_COLORS.primary,
  },
  modalCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
});


