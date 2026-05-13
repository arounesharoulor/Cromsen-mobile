import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, StatusBar, 
  TextInput, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Mail, Phone, Lock, MapPin, ArrowLeft, Camera, Save, Bell, Moon, Tag, Globe, Shield } from 'lucide-react-native';

import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { userService, authService } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function SettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState(user?.storedPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [origAddr, setOrigAddr] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // App Settings States
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [darkEnabled, setDarkEnabled] = useState(false);

  const currentUserId = user?._id || user?.id;

  // Fetch fresh profile on focus
  // Fetch profile and addresses on focus
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          // 1. First, attempt to load local addresses so the UI feels fast and reflects Checkout immediately
          const storedAddrs = await AsyncStorage.getItem('@UserAddresses');
          if (storedAddrs) {
            const addrs = JSON.parse(storedAddrs);
            if (addrs && addrs.length > 0) {
              const latest = addrs[addrs.length - 1];
              setAddress(latest.address || latest.street || '');
              setCity(latest.city || '');
              setState(latest.state || '');
              setZip(latest.zip || latest.pincode || '');
              setOrigAddr(latest);
            }
          }
          
          if (!currentUserId) {
            setIsFirstLoad(false);
            return;
          }

          // 2. Fetch fresh profile from backend
          try {
            const profile = await authService.getProfile(currentUserId);
            const u = profile.user || profile.data || profile;
            if (u) {
              setName(u.name || '');
              setEmail(u.email || '');
              if (u.phone) setPhone(u.phone);
              updateUser({ ...user, ...u });
            }
          } catch (err) {
            console.warn('Backend profile fetch failed:', err);
          }

          // 3. Fetch addresses from backend and override if they exist
          try {
            const backendAddrs = await userService.getAddresses(currentUserId);
            if (backendAddrs && backendAddrs.length > 0) {
              const latest = backendAddrs[backendAddrs.length - 1];
              setAddress(latest.address || latest.street || address);
              setCity(latest.city || city);
              setState(latest.state || state);
              setZip(latest.zip || latest.pincode || zip);
              setOrigAddr(latest);
              if (!phone && latest.phone) setPhone(latest.phone);
              
              // Sync backend addresses to local storage
              await AsyncStorage.setItem('@UserAddresses', JSON.stringify(backendAddrs));
            }
          } catch (err) {
            console.warn('Backend address fetch failed:', err);
          }
          
        } catch (e) {
          console.warn('Error in Settings loadData:', e);
        } finally {
          setIsFirstLoad(false);
        }
      };

      loadData();
    }, [currentUserId])
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) throw new Error('User not logged in');

      const nameChanged = name !== user?.name;
      const emailChanged = email !== user?.email;
      const phoneChanged = phone !== (user?.phone || '');
      const pwdChanged = newPassword.trim().length > 0;
      const addrChanged = address !== (origAddr?.address || '') || 
                          city !== (origAddr?.city || '') || 
                          state !== (origAddr?.state || '') || 
                          zip !== (origAddr?.zip || '');
      const anythingChanged = nameChanged || emailChanged || phoneChanged || pwdChanged || addrChanged;

      if (anythingChanged && !currentPassword) {
        Alert.alert('Authentication Required', 'Your current password is required to save changes. Please enter it below.');
        setLoading(false);
        return;
      }

      if (pwdChanged) {
        if (newPassword.length < 6) {
          Alert.alert('Error', 'New password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          setLoading(false);
          return;
        }
      }

      const updateData = { name, email, phone };
      if (pwdChanged) {
        updateData.currentPassword = currentPassword;
        updateData.password = newPassword;
      } else {
        // Even if password didn't change, we might need it for auth
        updateData.currentPassword = currentPassword;
      }

      // 1. Update Profile (Name, Email, Phone, Password)
      await userService.updateProfile(currentUserId, updateData);

      // 2. Update Address if provided
      if (address || city || zip) {
        const addrData = {
          name: name,
          address: address,
          city: city,
          state: state,
          zip: zip,
          phone: phone,
          type: 'HOME'
        };
        try {
          await userService.addAddress(currentUserId, addrData, currentPassword);
        } catch (e) {
          console.warn('Address sync failed:', e);
        }
      }

      // 3. Update local auth context
      // If password was changed, update storedPassword
      const updatedPassword = pwdChanged ? newPassword : currentPassword;
      await updateUser({ ...user, ...updateData, phone }, updatedPassword);
      addNotification('success', 'Profile Updated', 'Your profile details have been saved successfully.', 'Settings');
      
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, value, onChange, icon, props = {}) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, darkEnabled && darkStyles.label]}>{label}</Text>
      <View style={[styles.inputWrapper, darkEnabled && darkStyles.inputWrapper]}>
        <View style={styles.iconBox}>{icon}</View>
        <TextInput 
          style={[styles.input, darkEnabled && darkStyles.input]}
          value={value}
          onChangeText={onChange}
          placeholderTextColor={darkEnabled ? "#888" : "#94A3B8"}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, darkEnabled && darkStyles.container]}>
      <StatusBar barStyle={darkEnabled ? "light-content" : "dark-content"} backgroundColor={darkEnabled ? "#1E1E1E" : "#FFF"} />
      
      <View style={[styles.header, darkEnabled && darkStyles.header]}>
        <TouchableOpacity style={[styles.backBtn, darkEnabled && darkStyles.backBtn]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkEnabled && darkStyles.headerTitle]}>Edit Profile</Text>
        <TouchableOpacity disabled={loading} onPress={handleSave}>
          <Text style={[styles.headerSave, loading && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, darkEnabled && darkStyles.avatarCircle]}>
              <User size={40} color={THEME_COLORS.primary} />
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarName, darkEnabled && darkStyles.avatarName]}>{name || 'User'}</Text>
            <Text style={styles.avatarRole}>Cromsen Member</Text>
          </View>

          {/* Profile Details */}
          <Text style={[styles.sectionTitle, darkEnabled && darkStyles.sectionTitle]}>Profile Details</Text>
          <View style={[styles.card, darkEnabled && darkStyles.card]}>
            {renderInput('Full Name', name, setName, <User size={18} color="#64748B" />, { placeholder: 'Your name', placeholderTextColor: darkEnabled ? '#888' : '#94A3B8' })}
            {renderInput('Email Address', email, setEmail, <Mail size={18} color="#64748B" />, { 
              placeholder: 'name@example.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none'
            })}
            {renderInput('Phone Number', phone, (v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10)), <Phone size={18} color="#64748B" />, { 
              placeholder: '10-digit number',
              keyboardType: 'phone-pad',
              maxLength: 10
            })}
          </View>

          {/* Security */}
          <Text style={[styles.sectionTitle, darkEnabled && darkStyles.sectionTitle]}>Security</Text>
          <View style={[styles.card, darkEnabled && darkStyles.card]}>
            {renderInput('Current Password', currentPassword, setCurrentPassword, <Lock size={18} color="#64748B" />, { 
              placeholder: 'Required for changes',
              secureTextEntry: true,
              placeholderTextColor: darkEnabled ? '#888' : '#94A3B8'
            })}
            {renderInput('New Password', newPassword, setNewPassword, <Shield size={18} color="#64748B" />, { 
              placeholder: 'Leave blank to keep current',
              secureTextEntry: true,
              placeholderTextColor: darkEnabled ? '#888' : '#94A3B8'
            })}
          </View>

          {/* Address */}
          <Text style={[styles.sectionTitle, darkEnabled && darkStyles.sectionTitle]}>Shipping Information</Text>
          <View style={[styles.card, darkEnabled && darkStyles.card]}>
            {renderInput('Street Address', address, setAddress, <MapPin size={18} color="#64748B" />, { placeholder: 'House/Building/Street', placeholderTextColor: darkEnabled ? '#888' : '#94A3B8' })}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1.5 }}>
                {renderInput('City', city, setCity, null, { placeholder: 'City', placeholderTextColor: darkEnabled ? '#888' : '#94A3B8' })}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('ZIP Code', zip, setZip, null, { keyboardType: 'number-pad', placeholder: 'ZIP', placeholderTextColor: darkEnabled ? '#888' : '#94A3B8' })}
              </View>
            </View>
            {renderInput('State', state, setState, null, { placeholder: 'State/Province', placeholderTextColor: darkEnabled ? '#888' : '#94A3B8' })}
          </View>
          {/* App Preferences */}
          <Text style={[styles.sectionTitle, darkEnabled && darkStyles.sectionTitle]}>App Preferences</Text>
          <View style={[styles.card, darkEnabled && darkStyles.card]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, darkEnabled && darkStyles.settingIconWrap]}>
                <Bell size={18} color={THEME_COLORS.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, darkEnabled && darkStyles.settingTitle]}>Push Notifications</Text>
                <Text style={styles.settingSub}>Order updates & delivery status</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#E2E8F0', true: THEME_COLORS.secondary }}
                thumbColor="#FFF"
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder, darkEnabled && darkStyles.settingRowBorder]}>
              <View style={[styles.settingIconWrap, darkEnabled && darkStyles.settingIconWrap]}>
                <Tag size={18} color={THEME_COLORS.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, darkEnabled && darkStyles.settingTitle]}>Promotional Offers</Text>
                <Text style={styles.settingSub}>Receive sales & discount alerts</Text>
              </View>
              <Switch
                value={promoEnabled}
                onValueChange={setPromoEnabled}
                trackColor={{ false: '#E2E8F0', true: THEME_COLORS.secondary }}
                thumbColor="#FFF"
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder, darkEnabled && darkStyles.settingRowBorder]}>
              <View style={[styles.settingIconWrap, darkEnabled && darkStyles.settingIconWrap]}>
                <Moon size={18} color={THEME_COLORS.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, darkEnabled && darkStyles.settingTitle]}>Dark Mode</Text>
                <Text style={styles.settingSub}>Match system theme</Text>
              </View>
              <Switch
                value={darkEnabled}
                onValueChange={setDarkEnabled}
                trackColor={{ false: '#E2E8F0', true: THEME_COLORS.secondary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.mainSaveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.mainSaveTxt}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  headerSave: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.secondary },
  
  scroll: { padding: 20, paddingBottom: 60 },

  /* Avatar */
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, position: 'relative',
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  avatarName: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  avatarRole: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },

  /* Card and Inputs */
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    height: 52, paddingHorizontal: 12,
  },
  iconBox: { width: 32, alignItems: 'center' },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B', marginLeft: 8 },

  /* Main Button */
  mainSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME_COLORS.primary, height: 56, borderRadius: 16,
    gap: 10, marginTop: 10,
    shadowColor: THEME_COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  mainSaveTxt: { color: '#FFF', fontSize: 17, fontWeight: '900' },

  /* App Preferences */
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
  },
  settingRowBorder: {
    borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4, paddingTop: 16,
  },
  settingIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  settingTextWrap: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  settingSub: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: '#121212' },
  header: { backgroundColor: '#1E1E1E', borderBottomColor: '#2C2C2C' },
  headerTitle: { color: '#FFFFFF' },
  card: { backgroundColor: '#1E1E1E', shadowOpacity: 0.2, borderColor: '#2C2C2C', borderWidth: 1 },
  sectionTitle: { color: '#A0AAB5' },
  label: { color: '#CBD5E1' },
  inputWrapper: { backgroundColor: '#2C2C2C', borderColor: '#3F3F46' },
  input: { color: '#FFFFFF' },
  settingTitle: { color: '#FFFFFF' },
  settingRowBorder: { borderTopColor: '#2C2C2C' },
  settingIconWrap: { backgroundColor: '#2C2C2C' },
  avatarName: { color: '#FFFFFF' },
  avatarCircle: { backgroundColor: '#2C2C2C' },
  backBtn: { backgroundColor: '#2C2C2C' },
});

