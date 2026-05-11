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
      { icon: HelpCircle, label: 'Support & Help', screen: null },
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
  const { user, logout: authLogout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [profileImage, setProfileImage] = useState(null);

  const [showImageOptions, setShowImageOptions] = useState(false);

  const userName = sanitizeData(user?.name, 'Abishek Kevin');
  const userEmail = user?.email || 'kevin@madhuratechnologies.com';

  const handleRemoveImage = () => {
    setProfileImage(null);
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
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image from device.");
    } finally {
      setShowImageOptions(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Your Account</Text>
        <Code size={20} color={THEME_COLORS.primary} />
      </View>


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <Text style={styles.cardHeaderTitle}>Your Account</Text>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <View style={[styles.avatarImg, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <User size={40} color="#94A3B8" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editBadge} onPress={() => setShowImageOptions(true)}>
              <Pencil size={12} color="#FFF" />
            </TouchableOpacity>

          </View>

          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileEmail}>{userEmail}</Text>
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.sectionCard}>
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
                  <View style={styles.menuIconWrap}>
                    <item.icon size={18} color="#000" />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <ArrowRight size={16} color="#000" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>CROMSEN • v1.0.4</Text>

      </ScrollView>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowImageOptions(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profile Photo</Text>
            <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
              <Text style={styles.modalOptionTxt}>Change Photo</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity style={styles.modalOption} onPress={handleRemoveImage}>
                <Text style={[styles.modalOptionTxt, { color: '#EF4444' }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.modalOption, styles.modalCancel]} onPress={() => setShowImageOptions(false)}>
              <Text style={styles.modalOptionTxt}>Cancel</Text>
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
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
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


