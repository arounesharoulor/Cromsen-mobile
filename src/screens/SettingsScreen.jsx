import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, StatusBar, 
  TextInput, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Mail, Phone, Lock, MapPin, ArrowLeft, Camera, Save, Bell, Moon, Tag, Globe, Shield, ChevronDown, Search, Pencil, Eye, EyeOff } from 'lucide-react-native';

import { THEME_COLORS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { userService, authService } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email && !user.email.endsWith('@cromsen.com') ? user.email : '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState(user?.storedPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [origAddr, setOrigAddr] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Country Code Logic
  const COUNTRIES = [
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'United States', code: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'Qatar', code: '+974', flag: '🇶🇦' },
    { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
    { name: 'Oman', code: '+968', flag: '🇴🇲' },
    { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
  ];
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.includes(searchQuery)
  );

  // App Settings States
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { isDarkMode, toggleTheme, theme } = useTheme();

  const currentUserId = user?._id || user?.id;

  // Fetch fresh profile on focus
  // Fetch profile and addresses on focus
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          // 1. First, attempt to load local addresses so the UI feels fast and reflects Checkout immediately
          const addressKey = currentUserId ? `@UserAddresses_${currentUserId}` : '@UserAddresses_guest';
          const storedAddrs = await AsyncStorage.getItem(addressKey);
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
              setEmail(u.email && !u.email.endsWith('@cromsen.com') ? u.email : '');
              if (u.phone) {
                // Strip existing country code if present to avoid duplication in UI
                let cleanPhone = u.phone.replace(/^\+\d+\s?/, '').replace(/\D/g, '');
                setPhone(cleanPhone);
                
                // Try to match country from prefix if possible
                const prefixMatch = u.phone.match(/^\+(\d+)/);
                if (prefixMatch) {
                  const found = COUNTRIES.find(c => c.code === `+${prefixMatch[1]}`);
                  if (found) setSelectedCountry(found);
                }
              }
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
              if (!phone && latest.phone) {
                let cleanPhone = latest.phone.replace(/^\+\d+\s?/, '').replace(/\D/g, '');
                setPhone(cleanPhone);
              }
              
              // Sync backend addresses to local storage
              if (currentUserId) {
                await AsyncStorage.setItem(`@UserAddresses_${currentUserId}`, JSON.stringify(backendAddrs));
              }
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
      const emailChanged = email !== (user?.email && !user.email.endsWith('@cromsen.com') ? user.email : '');
      const phoneChanged = phone !== (user?.phone || '');
      const pwdChanged = newPassword.trim().length > 0;
      const addrChanged = address !== (origAddr?.address || '') || 
                          city !== (origAddr?.city || '') || 
                          state !== (origAddr?.state || '') || 
                          zip !== (origAddr?.zip || '');
      const anythingChanged = nameChanged || emailChanged || phoneChanged || pwdChanged || addrChanged;

      // Automatically use stored password if available, so user doesn't have to type it
      const autoPassword = currentPassword || user?.storedPassword;

      const finalEmail = email.trim() || (user?.email?.endsWith('@cromsen.com') ? user.email : `${phone.replace(/\s/g, '')}@cromsen.com`);

      const updateData = { 
        name, 
        email: finalEmail, 
        phone: phone.replace(/\s/g, ''),
        countryCode: selectedCountry.code
      };

      if (pwdChanged) {
        updateData.currentPassword = currentPassword || user?.storedPassword;
        updateData.password = newPassword;
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
          await userService.addAddress(currentUserId, addrData, autoPassword);
        } catch (e) {
          console.warn('Address sync failed:', e);
        }

        // Save address PERMANENTLY to local storage immediately!
        try {
          const addressKey = currentUserId ? `@UserAddresses_${currentUserId}` : '@UserAddresses_guest';
          const storedStr = await AsyncStorage.getItem(addressKey);
          let addrs = [];
          if (storedStr) {
            addrs = JSON.parse(storedStr);
          }
          if (!Array.isArray(addrs)) addrs = [];
          
          const newAddr = {
            id: origAddr?.id || String(Date.now()),
            name: name,
            address: address,
            city: city,
            state: state,
            zip: zip,
            phone: phone,
            type: origAddr?.type || 'HOME',
            full: `${address}, ${city}, ${state} - ${zip}`
          };
          
          const existingIdx = addrs.findIndex(a => String(a.id) === String(newAddr.id));
          if (existingIdx !== -1) {
            addrs[existingIdx] = newAddr;
          } else {
            addrs.push(newAddr);
          }
          
          await AsyncStorage.setItem(addressKey, JSON.stringify(addrs));
        } catch (storageErr) {
          console.warn('Failed to save address locally in settings:', storageErr);
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

  const renderInput = (label, value, onChange, icon, props = {}) => {
    const isPassword = props.secureTextEntry;
    const showValue = label.toLowerCase().includes('current') ? showCurrentPwd : showNewPwd;
    
    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        <View style={[
          styles.inputWrapper, 
          { backgroundColor: theme.background, borderColor: theme.border },
          !isEditing && { opacity: 0.7, backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }
        ]}>
          <View style={styles.iconBox}>{icon}</View>
          <TextInput 
            style={[styles.input, { color: theme.text }]}
            value={value}
            onChangeText={onChange}
            placeholderTextColor={theme.textSecondary}
            editable={isEditing}
            {...props}
            secureTextEntry={isPassword && !showValue}
          />
          {isPassword && isEditing && (
            <TouchableOpacity 
              style={{ padding: 10 }} 
              onPress={() => label.toLowerCase().includes('current') ? setShowCurrentPwd(!showCurrentPwd) : setShowNewPwd(!showNewPwd)}
            >
              {showValue ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDarkMode ? '#2C3E50' : '#F8FAFC' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Pencil size={20} color={isEditing ? theme.secondary : theme.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: isDarkMode ? '#2C3E50' : '#E2E8F0' }]}>
              <User size={40} color={theme.primary} />
              <TouchableOpacity style={[styles.cameraBtn, { borderColor: theme.surface, backgroundColor: theme.primary }]}>
                <Camera size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarName, { color: theme.text }]}>{name || 'User'}</Text>
            <Text style={[styles.avatarRole, { color: theme.textSecondary }]}>Cromsen Member</Text>
          </View>

          {/* Profile Details */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Profile Details</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderInput('Full Name', name, setName, <User size={18} color={theme.textSecondary} />, { placeholder: 'Your name' })}
            {renderInput('Email Address', email, setEmail, <Mail size={18} color={theme.textSecondary} />, { 
              placeholder: 'name@example.com',
              keyboardType: 'email-address',
              autoCapitalize: 'none'
            })}
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Phone Number</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                   style={[styles.inputWrapper, { width: 90, justifyContent: 'center', backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setShowCountryModal(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>{selectedCountry.flag}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{selectedCountry.code}</Text>
                    <ChevronDown size={14} color={theme.textSecondary} />
                  </View>
                </TouchableOpacity>
                <View style={[styles.inputWrapper, { flex: 1, backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={styles.iconBox}><Phone size={18} color={theme.textSecondary} /></View>
                  <TextInput 
                    style={[styles.input, { color: theme.text }]}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={isEditing}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Security */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Security</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderInput('Current Password', currentPassword, setCurrentPassword, <Lock size={18} color={theme.textSecondary} />, { 
              placeholder: 'Required for changes',
              secureTextEntry: true
            })}
            {renderInput('New Password', newPassword, setNewPassword, <Shield size={18} color={theme.textSecondary} />, { 
              placeholder: 'Leave blank to keep current',
              secureTextEntry: true
            })}
          </View>

          {/* Address */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Shipping Information</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {renderInput('Street Address', address, setAddress, <MapPin size={18} color={theme.textSecondary} />, { placeholder: 'House/Building/Street' })}
            {renderInput('City', city, setCity, null, { placeholder: 'City' })}
            {renderInput('ZIP Code', zip, setZip, null, { keyboardType: 'number-pad', placeholder: 'ZIP' })}
            {renderInput('State', state, setState, null, { placeholder: 'State/Province' })}
          </View>
          {/* App Preferences */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>App Preferences</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: theme.background }]}>
                <Bell size={18} color={theme.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Push Notifications</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Order updates & delivery status</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: theme.border, true: theme.secondary }}
                thumbColor="#FFF"
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: theme.border }]}>
              <View style={[styles.settingIconWrap, { backgroundColor: theme.background }]}>
                <Tag size={18} color={theme.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Promotional Offers</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Receive sales & discount alerts</Text>
              </View>
              <Switch
                value={promoEnabled}
                onValueChange={setPromoEnabled}
                trackColor={{ false: theme.border, true: theme.secondary }}
                thumbColor="#FFF"
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: theme.border }]}>
              <View style={[styles.settingIconWrap, { backgroundColor: theme.background }]}>
                <Moon size={18} color={theme.primary} />
              </View>
              <View style={styles.settingTextWrap}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSub, { color: theme.textSecondary }]}>Match system theme</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.secondary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity 
              style={[styles.mainSaveBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]} 
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
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Modal */}
      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={{ color: theme.primary, fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 15 }}>
              <Search size={18} color={theme.textSecondary} />
              <TextInput 
                style={{ flex: 1, height: 44, marginLeft: 8, color: theme.text }} 
                placeholder="Search country..." 
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={{ fontSize: 24, marginRight: 15 }}>{item.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 16, color: theme.textSecondary, fontWeight: '700' }}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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

