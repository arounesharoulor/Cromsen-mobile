import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Platform, StatusBar, Image, Dimensions, KeyboardAvoidingView, Linking, NativeModules, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

import { THEME_COLORS } from '../theme';
import { ArrowLeft, Check, ChevronRight, Plus, Trash2, MapPin, ClipboardList, CreditCard, ChevronDown, Search } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Modal as RNModal, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { getImageUrl, sanitizeData, userService } from '../services/api';
import Razorpay from '@codearcade/expo-razorpay';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';



const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
];

const { width } = Dimensions.get('window');


const STEPS = [
  { label: 'Address', icon: <MapPin size={12} color="#FFF" /> },
  { label: 'Order Summary', icon: <ClipboardList size={12} color="#FFF" /> },
  { label: 'Payment', icon: <CreditCard size={12} color="#FFF" /> },
];

/* ─── Add Address Form Styles ─── */
const f = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  formContainer: { padding: 20 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: THEME_COLORS.primary + '10',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mapBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.primary,
    marginLeft: 6,
  },
  btn: { flexDirection: 'row', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  field: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  fieldError: { borderColor: '#EB5757' },
  errorTxt: { fontSize: 11, color: '#EB5757', marginTop: 4 },
  locateMeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#004694', borderRadius: 12,
    paddingVertical: 10, marginBottom: 20,
  },
  locateMeTxt: { fontSize: 13, fontWeight: '700', color: '#004694', marginLeft: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  saveAsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  saveAsChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', backgroundColor: '#F8FAFC',
  },
  saveAsChipActive: { backgroundColor: '#004694', borderColor: '#004694' },
  saveAsTxt: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  saveBtn: {
    backgroundColor: '#004694', height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  saveBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});

/* ─── Add Address Form ─── */
function AddAddressForm({ onSave, initialData, user }) {
  // Map incoming data (could be raw backend format or formatted app format)
  const getInitialForm = () => {
    if (!initialData) {
      const name = user?.name || '';
      const phone = user?.phone || '';
      // Simple split for "+91 9876543210" format or just the number
      const code = phone.startsWith('+') ? phone.split(' ')[0] : '+91';
      const number = phone.includes(' ') ? phone.split(' ')[1] : (phone.startsWith('+91') ? phone.replace('+91', '') : phone);

      return {
        firstName: name,
        countryCode: code,
        mobile: number,
        pincode: '', state: '', city: '',
        line1: '', line2: '', saveAs: 'HOME',
      };
    }

    return {
      firstName: initialData.firstName || initialData.name || '',
      countryCode: initialData.countryCode || (initialData.phone?.startsWith('+') ? initialData.phone.split(' ')[0] : '+91'),
      mobile: initialData.mobile || (initialData.phone?.includes(' ') ? initialData.phone.split(' ')[1] : initialData.phone?.replace(/^\+\d+\s?/, '')) || '',
      pincode: initialData.pincode || initialData.zip || '',
      state: initialData.state || '',
      city: initialData.city || '',
      line1: initialData.line1 || initialData.address || '',
      line2: initialData.line2 || '',
      saveAs: initialData.saveAs || initialData.type || 'HOME',
    };
  };

  const [form, setForm] = useState(getInitialForm());
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [region, setRegion] = useState({
    latitude: 20.5937, // India center fallback
    longitude: 78.9629,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [marker, setMarker] = useState(null);

  const [errors, setErrors] = useState({});
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(c => c.code === form.countryCode) || COUNTRIES[0]
  );
  const set = (k, v) => {
    let val = v;
    if (k === 'mobile') val = v.replace(/[^0-9]/g, '').slice(0, 10);
    if (k === 'pincode') val = v.replace(/[^0-9]/g, '').slice(0, 6);
    
    setForm(f => ({ ...f, [k]: val }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  const validateAndSave = () => {
    const { firstName, mobile, pincode, state, city, line1 } = form;
    let newErrs = {};
    if (!firstName) newErrs.firstName = 'Required';
    if (!mobile) {
      newErrs.mobile = 'Required';
    } else if (mobile.length !== 10) {
      newErrs.mobile = 'Must be 10 digits';
    }
    if (!pincode) {
      newErrs.pincode = 'Required';
    } else if (pincode.length !== 6) {
      newErrs.pincode = 'Must be 6 digits';
    }
    if (!state) newErrs.state = 'Required';
    if (!city) newErrs.city = 'Required';
    if (!line1) newErrs.line1 = 'Required';

    if (Object.keys(newErrs).length > 0) {
      setErrors(newErrs);
      Alert.alert('Missing Info', 'Please fill out all the required fields in red.');
      return;
    }

    onSave({ ...form, countryCode: selectedCountry.code });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={f.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={f.formContainer}>

        {[
          { label: 'First name', key: 'firstName', placeholder: 'Enter full name' },
          { label: 'Mobile Number', key: 'mobile', placeholder: 'Enter mobile number', keyType: 'phone-pad', isPhone: true },
          { label: 'Pincode', key: 'pincode', placeholder: 'Enter pincode', keyType: 'number-pad', half: true },
          { label: 'State', key: 'state', placeholder: 'Enter State', half: true },
          { label: 'City', key: 'city', placeholder: 'Enter city' },
          { label: 'Address Line 1', key: 'line1', placeholder: 'House No, Building Name' },
          { label: 'Address Line 2', key: 'line2', placeholder: 'Street, Area', required: false },
        ].reduce((acc, field, idx, arr) => {
          if (field.isPhone) {
            acc.push(
              <View key={field.key} style={f.fieldGroup}>
                <Text style={f.fieldLabel}>{field.label}<Text style={{color: THEME_COLORS.error}}>*</Text></Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={[f.field, { width: 90, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4 }]}
                    onPress={() => setShowCountryModal(true)}
                  >
                    <Text style={{ fontSize: 16 }}>{selectedCountry.flag}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{selectedCountry.code}</Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>
                  <TextInput
                    style={[f.field, { flex: 1 }, errors[field.key] && f.fieldError]}
                    placeholder={field.placeholder}
                    placeholderTextColor={THEME_COLORS.textSecondary}
                    value={form[field.key]}
                    onChangeText={(v) => set(field.key, v)}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors[field.key] && <Text style={f.errorTxt}>{errors[field.key]}</Text>}
              </View>
            );
            return acc;
          }

          if (field.key === 'line2') {
            acc.push(
              <View key={field.key} style={f.fieldGroup}>
                <Text style={f.fieldLabel}>{field.label}{field.required !== false && <Text style={{color: THEME_COLORS.error}}>*</Text>}</Text>
                <TextInput
                  style={[f.field, errors[field.key] && f.fieldError]}
                  placeholder={field.placeholder}
                  placeholderTextColor={THEME_COLORS.textSecondary}
                  value={form[field.key]}
                  onChangeText={(v) => set(field.key, v)}
                />
                <TouchableOpacity 
                  style={f.mapBtn} 
                  onPress={() => {
                    const addr = `${form.line1}, ${form.line2}, ${form.city}, ${form.state} ${form.pincode}`;
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
                  }}
                >
                  <MapPin size={14} color={THEME_COLORS.primary} />
                  <Text style={f.mapBtnTxt}>Check Location on Google Maps</Text>
                </TouchableOpacity>
              </View>
            );
            return acc;
          }

          if (field.half) {
            if (idx > 0 && arr[idx-1]?.half) return acc; // Already rendered as the right side
            const next = arr[idx+1];
            acc.push(
              <View key={field.key} style={f.row}>
                <View style={[f.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={f.fieldLabel}>{field.label}<Text style={{color: THEME_COLORS.error}}>*</Text></Text>
                  <TextInput style={[f.field, errors[field.key] && f.fieldError]} placeholder={field.placeholder} value={form[field.key]} onChangeText={(v) => set(field.key, v)} keyboardType={field.keyType || 'default'} />
                  {errors[field.key] && <Text style={f.errorTxt}>{errors[field.key]}</Text>}
                </View>
                {next && next.half && (
                  <View style={[f.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={f.fieldLabel}>{next.label}<Text style={{color: THEME_COLORS.error}}>*</Text></Text>
                    <TextInput style={[f.field, errors[next.key] && f.fieldError]} placeholder={next.placeholder} value={form[next.key]} onChangeText={(v) => set(next.key, v)} keyboardType={next.keyType || 'default'} />
                    {errors[next.key] && <Text style={f.errorTxt}>{errors[next.key]}</Text>}
                  </View>
                )}
              </View>
            );
          } else {
            acc.push(
              <View key={field.key} style={f.fieldGroup}>
                <Text style={f.fieldLabel}>{field.label}{field.required !== false && <Text style={{color: THEME_COLORS.error}}>*</Text>}</Text>
                <TextInput
                  style={[f.field, errors[field.key] && f.fieldError]}
                  placeholder={field.placeholder}
                  placeholderTextColor={THEME_COLORS.textSecondary}
                  value={form[field.key]}
                  onChangeText={(v) => set(field.key, v)}
                  keyboardType={field.keyType || 'default'}
                />
                {errors[field.key] && <Text style={f.errorTxt}>{errors[field.key]}</Text>}
              </View>
            );
          }
          return acc;

        }, [])}

        <TouchableOpacity 
          style={f.locateMeBtn} 
          disabled={loadingLocation}
          onPress={async () => {
            try {
              setLoadingLocation(true);
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                setLoadingLocation(false);
                Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
                return;
              }

              let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              
              const { latitude, longitude } = location.coords;
              const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              };
              setRegion(newRegion);
              setMarker({ latitude, longitude });

              // Use Expo's reverse geocoding (uses native services like Google/Apple Maps)
              const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
              
              if (address) {
                // Combine house, street, and area into Address Line 1
                const houseInfo = address.name && address.name !== address.street ? address.name : '';
                const streetInfo = address.street || '';
                const areaInfo = address.district || address.subregion || '';
                
                const fullLine1 = [houseInfo, streetInfo, areaInfo]
                  .filter(Boolean)
                  .join(', ');

                setForm(f => ({
                  ...f,
                  pincode: address.postalCode || f.pincode,
                  state: address.region || f.state,
                  city: address.city || address.subregion || address.district || f.city,
                  line1: fullLine1 || f.line1,
                  line2: '', // Keep line 2 empty as requested
                }));
                Alert.alert('Success', 'Address auto-filled from your current location!');
              }
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to fetch location. Please check your GPS and internet connection.');
            } finally {
              setLoadingLocation(false);
            }
          }}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={THEME_COLORS.primary} />
          ) : (
            <MapPin size={16} color={THEME_COLORS.primary} />
          )}
          <Text style={f.locateMeTxt}>{loadingLocation ? 'Fetching Location...' : 'Use Current Location'}</Text>
        </TouchableOpacity>

        {/* Google Map View */}
        <View style={{ height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1.5, borderColor: '#E2E8F0' }}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            region={region}
            onPress={async (e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ latitude, longitude });
              try {
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (address) {
                  const houseInfo = address.name && address.name !== address.street ? address.name : '';
                  const streetInfo = address.street || '';
                  const areaInfo = address.district || address.subregion || '';
                  
                  const fullLine1 = [houseInfo, streetInfo, areaInfo]
                    .filter(Boolean)
                    .join(', ');

                  setForm(f => ({
                    ...f,
                    pincode: address.postalCode || f.pincode,
                    state: address.region || f.state,
                    city: address.city || address.subregion || address.district || f.city,
                    line1: fullLine1 || f.line1,
                    line2: '', // Keep line 2 empty
                  }));
                }
              } catch (err) {
                console.warn('Geocoding error:', err);
              }
            }}
          >
            {marker && <Marker coordinate={marker} />}
          </MapView>
        </View>


        <Text style={f.sectionLabel}>Save Address as</Text>
        <View style={f.saveAsRow}>
          {['HOME', 'OFFICE', 'OTHER'].map((t, i) => (
            <TouchableOpacity
              key={i}
              style={[f.saveAsChip, form.saveAs === t && f.saveAsChipActive]}
              onPress={() => set('saveAs', t)}
            >
              <Text style={[f.saveAsTxt, form.saveAs === t && { color: '#FFF' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>


        <TouchableOpacity 
          style={f.saveBtn} 
          onPress={validateAndSave}
        >
          <Text style={f.saveBtnTxt}>Save address</Text>
        </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Country Modal */}
      <RNModal visible={showCountryModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryModal(false)} />
          <View style={s.countryModalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text style={s.closeBtn}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={s.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={s.countryFlagLarge}>{item.flag}</Text>
                  <Text style={s.countryName}>{item.name}</Text>
                  <Text style={s.countryCodeVal}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </RNModal>
    </KeyboardAvoidingView>
  );
}


export default function CheckoutScreen({ navigation, route }) {
  const { cartItems: contextCartItems, clearCart } = useCart();
  const directItem = route?.params?.directItem;
  const cartItems = directItem ? [directItem] : contextCartItems;
  
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [addresses, setAddresses] = useState([]);
  const [step, setStep] = useState(0);
  const [selAddr, setSelAddr] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');

  const [paymentHtml, setPaymentHtml] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [pendingOrderDetails, setPendingOrderDetails] = useState(null);


  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) return;

      const addressKey = `@UserAddresses_${currentUserId}`;

      // 1. Fetch from backend
      const data = await userService.getAddresses(currentUserId);
      const backendAddrs = Array.isArray(data) ? data : data.data || data.addresses || [];
      
      // 2. Load locally stored addresses
      const stored = await AsyncStorage.getItem(addressKey);
      let localAddrs = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(localAddrs)) localAddrs = [];

      // 3. Merging logic to preserve local-only changes while fetching server changes
      let merged = [...localAddrs];
      
      backendAddrs.forEach(bAddr => {
        const bFormatted = {
          id: bAddr._id || bAddr.id,
          type: bAddr.saveAs || bAddr.type || 'HOME',
          name: bAddr.name || bAddr.firstName || '',
          address: bAddr.street || bAddr.address || '',
          line2: bAddr.line2 || '',
          city: bAddr.city || '',
          state: bAddr.state || '',
          zip: bAddr.zip || bAddr.pincode || '',
          phone: bAddr.phone || '',
          full: bAddr.full || `${bAddr.street || bAddr.address || ''}, ${bAddr.line2 ? bAddr.line2 + ', ' : ''}${bAddr.city || ''}, ${bAddr.state || ''} - ${bAddr.zip || bAddr.pincode || ''}`
        };

        const idx = merged.findIndex(m => String(m.id) === String(bFormatted.id));
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...bFormatted };
        } else {
          // Fallback duplicate check by content
          const dupIdx = merged.findIndex(m => 
            (m.address || '').toLowerCase() === (bFormatted.address || '').toLowerCase() &&
            (m.city || '').toLowerCase() === (bFormatted.city || '').toLowerCase() &&
            (m.zip || '') === (bFormatted.zip || '')
          );
          if (dupIdx !== -1) {
            merged[dupIdx] = { ...merged[dupIdx], ...bFormatted };
          } else {
            merged.push(bFormatted);
          }
        }
      });

      if (merged.length > 0) {
        setAddresses(merged);
        await AsyncStorage.setItem(addressKey, JSON.stringify(merged));
        if (!selAddr) {
          setSelAddr(merged[0].id || merged[0]._id);
        }
      }
    } catch (e) { 
      console.error('Error loading addresses:', e);
      const currentUserId = user?._id || user?.id;
      if (currentUserId) {
        const stored = await AsyncStorage.getItem(`@UserAddresses_${currentUserId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAddresses(parsed);
          if (parsed.length > 0 && !selAddr) {
            setSelAddr(parsed[0].id || parsed[0]._id);
          }
        }
      }
    }
  };

  const handleSaveAddress = async (newAddr) => {
    try {
      const currentUserId = user?._id || user?.id;
      const formatted = {
        id: editingAddr ? (editingAddr.id || editingAddr._id) : Date.now().toString(),
        type: newAddr.saveAs || 'HOME',
        name: newAddr.firstName,
        address: newAddr.line1,
        line2: newAddr.line2,
        city: newAddr.city,
        state: newAddr.state,
        zip: newAddr.pincode,
        phone: newAddr.mobile,
        countryCode: newAddr.countryCode,
        full: `${newAddr.line1}, ${newAddr.line2 ? newAddr.line2 + ', ' : ''}${newAddr.city}, ${newAddr.state} - ${newAddr.pincode}`,
      };

      // Save to backend if logged in
      if (currentUserId) {
        try {
          await userService.addAddress(currentUserId, formatted, user?.storedPassword);
          
          // Also update user profile if name or phone changed
          const profileUpdate = {};
          if (!user?.phone || user.phone !== formatted.phone) profileUpdate.phone = formatted.phone;
          if (!user?.name || user.name !== formatted.name) profileUpdate.name = formatted.name;

          if (Object.keys(profileUpdate).length > 0) {
            await userService.updateProfile(currentUserId, { 
              ...profileUpdate,
              currentPassword: user?.storedPassword
            });
            updateUser({ ...user, ...profileUpdate });
          }
        } catch (err) {
          console.warn('Backend sync failed, state will still be updated locally:', err);
        }
      }

      let updated;
      if (editingAddr) {
        updated = addresses.map(a => (a.id === editingAddr.id || a._id === editingAddr._id) ? formatted : a);
      } else {
        updated = [...addresses, formatted];
      }
      
      // Update local storage and UI immediately
      setAddresses(updated);
      if (currentUserId) {
        await AsyncStorage.setItem(`@UserAddresses_${currentUserId}`, JSON.stringify(updated));
      }
      updateUser({ ...user, addresses: updated });
      setSelAddr(formatted.id);
      setShowAddForm(false);
      setEditingAddr(null);
    } catch (e) { 
      console.warn('Error saving address:', e); 
    }
  };

  const handleDeleteAddress = async (id) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    
    const currentUserId = user?._id || user?.id;
    if (currentUserId) {
      await AsyncStorage.setItem(`@UserAddresses_${currentUserId}`, JSON.stringify(updated));
    }
    if (selAddr === id) setSelAddr(updated.length > 0 ? updated[0].id : null);

    if (currentUserId) {
      try {
        await userService.deleteAddress(currentUserId, id, user?.storedPassword);
      } catch (err) {
        console.warn('Backend address delete failed:', err);
      }
    }
  };


  const handleWebViewMessage = async (event) => {
    try {
      const result = JSON.parse(event.nativeEvent.data);
      if (result.status === 'success') {
        setShowWebView(false);
        const { finalOrder, rzpOrderData } = pendingOrderDetails;
        const paymentData = result;
        const API_URL = 'https://cromsen-backend.onrender.com/api';
        
        // STEP 5: VERIFY PAYMENT & SAVE ORDER TO ADMIN (Done in one call now)
        try {
          await userService.verifyPayment({
            razorpay_order_id: result.razorpay_order_id,
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_signature: result.razorpay_signature,
          }, finalOrder);
        } catch (vErr) {
          console.warn('Verify Payment Error:', vErr);
        }

        // STEP 6: FINALIZE LOCAL STATE
        const finalOrderWithPayment = {
          ...finalOrder,
          paymentStatus: 'Paid',
          paymentId: result.razorpay_payment_id,
          razorpay_order_id: result.razorpay_order_id,
        };
        
        const currentUserId = user?._id || user?.id;
        const ordersKey = currentUserId ? `@UserOrders_${currentUserId}` : '@UserOrders_guest';
        const storedOrders = await AsyncStorage.getItem(ordersKey);
        const orders = storedOrders ? JSON.parse(storedOrders) : [];
        await AsyncStorage.setItem(ordersKey, JSON.stringify([finalOrderWithPayment, ...orders]));

        addNotification('success', 'Order Placed ✓', `Your order ${finalOrder.id} has been placed successfully!`, 'Orders');
        clearCart();
        navigation.replace('Main', { screen: 'HomeTab', params: { paymentSuccess: true } });

      } else if (result.status === 'cancelled') {
        setShowWebView(false);
        alert('Payment Cancelled by user.');
      } else if (result.status === 'failed') {
        setShowWebView(false);
        alert('Payment Failed.');
      }
    } catch (e) {
      console.error("WebView Message Error", e);
      setShowWebView(false);
      alert('An error occurred while processing the payment.');
    }
  };


  const subtotal = cartItems.reduce((acc, item) => {
    const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    return acc + (price * (item.quantity || 1));
  }, 0);
  
  // Align with CartScreen logic for consistency
  const discount = 0; // Discount removed as per request
  const packagingFee = 7; // Packaging fee
  const shippingFee = 20; // Shipping fee
  const total = subtotal - discount + packagingFee;
  const grandTotal = total + shippingFee;


  const next = async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty! Please add products before checking out.');
      navigation.navigate('Main');
      return;
    }

    if (step === 0) {
      if (!selAddr) {
        alert('Please select or add a delivery address');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Place Order Logic
      try {
        const selectedAddress = addresses.find(a => (a.id === selAddr || a._id === selAddr));
        
        // Fetch all orders to find the highest numerical sequence ID (e.g., from CIM-#1004 to CIM-#1005)
        let nextOrderNum = 1001; 
        try {
          const allOrdersResp = await fetch('https://cromsen-backend.onrender.com/api/orders');
          if (allOrdersResp.ok) {
            const allOrdersData = await allOrdersResp.json();
            const allOrders = Array.isArray(allOrdersData) ? allOrdersData : (allOrdersData.orders || allOrdersData.data || []);
            
            // Find the highest number in existing CIDM, CIM or CIW IDs
            const sequenceNumbers = allOrders
              .map(o => {
                const idStr = String(o.id || o._id || '');
                const match = idStr.match(/(?:CIM|CIW|CIDM)-?#(\d+)/);
                return match ? parseInt(match[1], 10) : null;
              })
              .filter(n => n !== null);
            
            if (sequenceNumbers.length > 0) {
              nextOrderNum = Math.max(...sequenceNumbers) + 1;
            } else {
              nextOrderNum = 1001 + allOrders.length;
            }
          }
        } catch (err) {
          console.warn('Order sequence fetch failed:', err);
          nextOrderNum = Math.floor(1005 + Math.random() * 9000);
        }

        const orderId = `CIM-#${nextOrderNum}`;
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
        
        const firstItem = cartItems[0] || {};
        
        // Simulation of Razorpay Payment Process
        let paymentId = 'COD';
        let paymentStatus = 'Pending';
        
        if (paymentMethod === 'RAZORPAY') {
          const API_URL = 'https://cromsen-backend.onrender.com/api';

          try {
            const finalAmount = Math.round(grandTotal);
            console.log(`Initializing Razorpay Order: Amount ${finalAmount} (INR)`);

            // STEP 1: CREATE ORDER FROM BACKEND
            // Note: Sending amount in paise (Rupees * 100) to avoid Bad Request (400)
            const rzpOrderRes = await fetch(`${API_URL}/payment/create-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: finalAmount }),
            });

            if (!rzpOrderRes.ok) {
              const errTxt = await rzpOrderRes.text();
              throw new Error(`Backend Payment Error ${rzpOrderRes.status}: ${errTxt}`);
            }

            const rzpOrderData = await rzpOrderRes.json();
            console.log('Razorpay Order Data:', rzpOrderData);

            if (!rzpOrderData?.id) {
              throw new Error('No Razorpay Order ID returned');
            }

            // STEP 2: PREPARE ORDER FOR ADMIN TABLE
            const finalOrder = {
              id: orderId,
              orderId: nextOrderNum, // Send only the number to let backend/admin dashboard format it correctly
              date: date,
              status: 'Processing',
              paymentStatus: 'Pending',
              paymentId: rzpOrderData.id,
              paymentMethod: 'RAZORPAY',
              total: finalAmount,
              totalAmount: finalAmount, // Added for backend compatibility
              itemsCount: cartItems.length,
              mainProduct: sanitizeData(firstItem.name || 'Product', 'Product'),
              image: getImageUrl(firstItem.image),
              user: user?._id || user?.id, // Changed from userId to user
              userId: user?._id || user?.id,
              email: user?.email || '',
              guestEmail: user?.email || '', // Added for backend compatibility
              items: cartItems.map(item => ({
                ...item,
                productId: item._id || item.id || '',
                _id: item._id || item.id || item.product || '',
                name: sanitizeData(item.name || 'Product', 'Product'),
                image: getImageUrl(item.image),
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
              })),
              address: selectedAddress,
              shippingAddress: {
                name: selectedAddress.name || user?.name || 'Guest',
                address: selectedAddress.full || selectedAddress.address,
                city: selectedAddress.city,
                state: selectedAddress.state,
                zip: selectedAddress.zip,
                phone: selectedAddress.phone,
                country: 'India'
              },
            };

            // STEP 3: SAVE PENDING ORDER TO ADMIN
            try {
              await userService.createOrder(finalOrder);
              console.log('Order synced to Admin Table');
            } catch (syncErr) {
              console.warn('Admin Sync Warning:', syncErr);
            }

            // STEP 4: CHOOSE METHOD (Native SDK vs Secure Browser)
            // Using the @codearcade/expo-razorpay wrapper which works in Expo
            if (Razorpay && typeof Razorpay.open === 'function') {
              console.log('Opening Razorpay via Expo Wrapper...');
              
              const options = {
                key: 'rzp_test_SNY1G9ELPHlY7P',
                amount: (finalAmount * 100).toString(),
                currency: 'INR',
                order_id: rzpOrderData.id,
                name: 'Cromsen',
                prefill: {
                  name: user?.name || selectedAddress?.name || 'Customer',
                  email: user?.email || 'customer@example.com',
                  contact: selectedAddress?.phone?.replace(/\D/g, '').slice(-10) || '9999999999',
                },
                theme: { color: '#004694' },
                modal: { ondismiss: () => alert('Payment Cancelled') },
              };

              const paymentData = await Razorpay.open(options);
              console.log('Payment Success:', paymentData);

              // STEP 5: VERIFY PAYMENT & SAVE ORDER
              // STEP 5: VERIFY PAYMENT & SAVE ORDER TO ADMIN
              try {
                await userService.verifyPayment({
                  razorpay_order_id: paymentData.razorpay_order_id,
                  razorpay_payment_id: paymentData.razorpay_payment_id,
                  razorpay_signature: paymentData.razorpay_signature,
                }, finalOrder);
              } catch (vErr) {
                console.warn('Verify Payment Error (Native):', vErr);
              }

              // STEP 6: FINALIZE LOCAL STATE
              const finalOrderWithPayment = {
                ...finalOrder,
                paymentStatus: 'Paid',
                paymentId: paymentData.razorpay_payment_id,
                razorpay_order_id: paymentData.razorpay_order_id,
              };

              const currentUserId = user?._id || user?.id;
              const ordersKey = currentUserId ? `@UserOrders_${currentUserId}` : '@UserOrders_guest';
              const storedOrders = await AsyncStorage.getItem(ordersKey);
              const orders = storedOrders ? JSON.parse(storedOrders) : [];
              await AsyncStorage.setItem(ordersKey, JSON.stringify([finalOrderWithPayment, ...orders]));
 
              addNotification('success', 'Order Placed ✓', `Your order ${finalOrder.id} has been placed successfully!`, 'Orders');
 
              if (!directItem) clearCart();
              navigation.replace('Main', { screen: 'HomeTab', params: { paymentSuccess: true } });
            } else {
              // METHOD B: WEBVIEW FALLBACK FOR EXPO GO
              console.log('Native SDK not linked, injecting Razorpay via WebView...');
              
              setPendingOrderDetails({ finalOrder, rzpOrderData });
              
              const html = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                </head>
                <body style="background-color: #fff; height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0;">
                  <h3 style="text-align: center; font-family: sans-serif; color: #666;">Loading Secure Payment...</h3>
                  <script>
                    var options = {
                      "key": "rzp_test_SNY1G9ELPHlY7P",
                      "amount": "${Math.floor(finalAmount * 100)}",
                      "currency": "INR",
                      "name": "Cromsen",
                      "description": "Order Payment",
                      "order_id": "${rzpOrderData.id}",
                      "prefill": {
                        "name": "${user?.name || selectedAddress?.name || 'Customer'}",
                        "email": "${user?.email || 'customer@example.com'}",
                        "contact": "${selectedAddress?.phone?.replace(/\\D/g, '').slice(-10) || '9999999999'}"
                      },
                      "theme": {
                        "color": "#004694"
                      },
                      "handler": function (response){
                        window.ReactNativeWebView.postMessage(JSON.stringify({ 
                          status: 'success', 
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_signature: response.razorpay_signature 
                        }));
                      },
                      "modal": {
                        "ondismiss": function(){
                          window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
                        }
                      }
                    };
                    var rzp1 = new Razorpay(options);
                    rzp1.on('payment.failed', function (response){
                      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'failed' }));
                    });
                    
                    setTimeout(function() {
                      rzp1.open();
                    }, 500);
                  </script>
                </body>
                </html>
              `;
              
              setPaymentHtml(html);
              setShowWebView(true);
            }

          } catch (err) {
            console.error('Razorpay Error:', err);
            alert(err.message || 'Payment cancelled or failed');
          }
          return;
        }

        // COD Flow
        const newOrder = {
          id: orderId,
          orderId: nextOrderNum, // Send only the number to let backend/admin dashboard format it correctly
          date: date,
          status: 'Processing',
          paymentStatus: 'Pending',
          paymentId: 'COD',
          paymentMethod: 'COD',
          total: grandTotal,
          itemsCount: cartItems.length,
          mainProduct: sanitizeData(firstItem.name || 'Product', 'Product'),
          image: getImageUrl(firstItem.image),
          userId: user?._id || user?.id,
          email: user?.email || '',
          items: cartItems.map(item => ({
            ...item,
            productId: item._id || item.id || '',  // Explicitly preserve product ID for reviews
            _id: item._id || item.id || item.product || '',
            name: sanitizeData(item.name || 'Product', 'Product'),
            image: getImageUrl(item.image),
            price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0
          })),
          address: selectedAddress,
        };

        const finalCODOrder = {
          ...newOrder,
          user: (user?._id || user?.id),
          userId: (user?._id || user?.id),
          guestEmail: user?.email || '',
          total: grandTotal,
          totalAmount: grandTotal,
          orderId: nextOrderNum, // Added for backend compatibility
          shippingAddress: {
            name: selectedAddress.name || user?.name || 'Guest',
            address: selectedAddress.full || selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            zip: selectedAddress.zip,
            phone: selectedAddress.phone,
            country: 'India'
          }
        };
 
        try {
          await userService.createOrder(finalCODOrder);
          console.log('COD Order synced to Admin Table');
        } catch (syncErr) {
          console.warn('COD Admin Sync Warning:', syncErr);
        }
        const currentUserId = user?._id || user?.id;
        const ordersKey = currentUserId ? `@UserOrders_${currentUserId}` : '@UserOrders_guest';
        const storedOrders = await AsyncStorage.getItem(ordersKey);
        const orders = storedOrders ? JSON.parse(storedOrders) : [];
        await AsyncStorage.setItem(ordersKey, JSON.stringify([newOrder, ...orders]));

        addNotification('success', 'Order Placed ✓', `Your order ${newOrder.id} has been placed successfully!`, 'Orders');

        if (!directItem) clearCart();
        alert('Order Placed Successfully!');
        navigation.navigate('Main');
      } catch (e) {
        console.error('Checkout Error:', e);
        alert(`Failed to place order: ${e.message || 'Unknown error'}`);
      }
    }
  };


  const back = () => {
    if (showAddForm) setShowAddForm(false);
    else if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const StepBar = () => (
    <View style={s.stepBar}>
      {STEPS.map((lbl, i) => (
        <React.Fragment key={i}>
          <View style={s.stepItem}>
            <View style={[s.stepCircle, i <= step && s.stepCircleActive]}>
              {i < step ? <Check size={12} color="#FFF" /> : STEPS[i].icon}
            </View>
            <Text style={[s.stepLabel, i <= step && s.stepLabelActive]}>{lbl.label}</Text>
          </View>
          {i < STEPS.length - 1 && <View style={[s.stepLine, i < step && s.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={back}>
          <ArrowLeft size={20} color={THEME_COLORS.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {showAddForm ? 'Add Address' : step === 0 ? 'Select Delivery Address' : step === 1 ? 'Order Summary' : 'Payment'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {!showAddForm && <StepBar />}

      {showAddForm ? (
        <AddAddressForm onSave={handleSaveAddress} initialData={editingAddr} user={user} />
      ) : step === 0 ? (
        <ScrollView contentContainerStyle={s.content}>
          {addresses.map((addr) => {
            const addrId = addr.id || addr._id;
            const isActive = selAddr === addrId;
            return (
              <TouchableOpacity
                key={addrId}
                style={[s.addrCard, isActive && s.addrCardActive]}
                onPress={() => setSelAddr(addrId)}
              >
                <View style={s.addrCardHeader}>
                  <View style={[s.addrTypeBadge, { backgroundColor: THEME_COLORS.primary }]}>
                    <Text style={s.addrTypeTxt}>{addr.type}</Text>
                  </View>
                  <View style={[s.radio, isActive && s.radioActive]}>
                    {isActive && <View style={s.radioInner} />}
                  </View>
                </View>
                <Text style={s.addrName}>{addr.name}</Text>
                <Text style={s.addrPhone}>{addr.phone}</Text>
                <Text style={s.addrFull}>{addr.full}</Text>
                
                <View style={s.addrActions}>
                  <TouchableOpacity onPress={() => { setEditingAddr(addr); setShowAddForm(true); }} style={s.addrActionBtn}>
                    <Text style={s.addrActionTxt}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAddress(addrId)} style={s.addrActionBtn}>
                    <Text style={[s.addrActionTxt, { color: '#EB5757' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          
          <TouchableOpacity style={s.addNewBtn} onPress={() => { setEditingAddr(null); setShowAddForm(true); }}>
            <View style={s.plusCircle}><Plus size={16} color={THEME_COLORS.primary} /></View>
            <Text style={s.addNewTxt}>Add New Address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnTxt}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : step === 1 ? (
        <ScrollView contentContainerStyle={s.content}>
          {/* Selected Address Summary */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => setStep(0)}>
              <Text style={s.changeBtnTxt}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={s.summaryCard}>
            {addresses.find(a => a.id === selAddr || a._id === selAddr) ? (
              <>
                <Text style={s.summaryName}>{addresses.find(a => a.id === selAddr || a._id === selAddr).name}</Text>
                <Text style={s.summaryText}>{addresses.find(a => a.id === selAddr || a._id === selAddr).full}</Text>
                <Text style={s.summaryText}>{addresses.find(a => a.id === selAddr || a._id === selAddr).phone}</Text>
              </>
            ) : null}
          </View>

          {/* Items Summary */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Order Items</Text>
            <Text style={s.itemCountTxt}>{cartItems.length} items</Text>
          </View>
          {cartItems.map((item, idx) => (
            <View key={idx} style={s.itemSummaryRow}>
              <Image source={{ uri: getImageUrl(item.image) }} style={s.itemThumb} />
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={1}>{sanitizeData(item.name, 'Product')}</Text>
                <Text style={[s.itemPrice, { fontSize: 10, marginBottom: 2 }]} numberOfLines={1}>{item.variant || 'Standard'}</Text>
                <Text style={s.itemPrice}>₹{item.price} x {item.quantity}</Text>
              </View>
              <Text style={s.itemSubtotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}


          {/* Price Summary */}
          <View style={s.priceSummary}>
            <View style={s.priceRow}><Text style={s.priceLbl}>Subtotal</Text><Text style={s.priceVal}>₹{subtotal}</Text></View>
            <View style={s.priceRow}><Text style={s.priceLbl}>Shipping</Text><Text style={s.priceVal}>₹{shippingFee}</Text></View>
            <View style={s.priceRow}><Text style={s.priceLbl}>Packaging Fee</Text><Text style={s.priceVal}>₹{packagingFee}</Text></View>
            <View style={[s.priceRow, {marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'}]}>
              <Text style={s.totalLbl}>Order Total</Text>
              <Text style={s.totalVal}>₹{grandTotal}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnTxt}>Continue to Payment</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Payment Method</Text>
          </View>
          
          <View style={[s.paymentCard, {borderColor: THEME_COLORS.primary, borderWidth: 2}]}>
            <View style={s.paymentHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CreditCard size={20} color={THEME_COLORS.primary} />
                <Text style={s.paymentName}>Online Payment (Razorpay)</Text>
              </View>
              <View style={[s.radio, s.radioActive]}>
                <View style={s.radioInner} />
              </View>
            </View>
            <Text style={s.paymentDesc}>Pay securely via Credit Card, Debit Card, UPI, or Netbanking using your Razorpay account.</Text>
          </View>

          <View style={s.priceSummary}>
             <View style={s.priceRow}>
              <Text style={s.totalLbl}>Payable Amount</Text>
              <Text style={s.totalVal}>₹{grandTotal}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnTxt}>Place Order</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Razorpay WebView Modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ height: 50, backgroundColor: '#f8f9fa', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Text style={{ fontSize: 16, color: THEME_COLORS.primary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', marginRight: 40 }}>Secure Payment</Text>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF1F3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME_COLORS.primary },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME_COLORS.surface, paddingVertical: 20, paddingHorizontal: 40,
    borderBottomWidth: 1, borderBottomColor: THEME_COLORS.background,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: THEME_COLORS.primary },
  stepLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  stepLabelActive: { color: THEME_COLORS.text },
  stepLine: { width: 40, height: 2, backgroundColor: '#CBD5E1', marginBottom: 15, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: THEME_COLORS.primary },

  content: { padding: 20, paddingBottom: 40 },
  addrCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  addrCardActive: { borderColor: THEME_COLORS.primary },
  addrCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addrTypeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  addrTypeTxt: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: THEME_COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME_COLORS.primary },
  addrName: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text, marginBottom: 4 },
  addrPhone: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.primary, marginBottom: 8 },
  addrFull: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  addrActions: { flexDirection: 'row', marginTop: 12, gap: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  addrActionBtn: { paddingVertical: 4 },
  addrActionTxt: { fontSize: 13, fontWeight: '800', color: THEME_COLORS.primary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text },
  changeBtnTxt: { fontSize: 13, fontWeight: '700', color: THEME_COLORS.primary },
  itemCountTxt: { fontSize: 13, color: THEME_COLORS.textSecondary },

  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryName: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 6 },
  summaryText: { fontSize: 13, color: THEME_COLORS.textSecondary, lineHeight: 18 },

  itemSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#FFF', padding: 12, borderRadius: 12 },
  itemThumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },
  itemPrice: { fontSize: 12, color: THEME_COLORS.textSecondary, marginTop: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.text },

  priceSummary: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLbl: { fontSize: 14, color: THEME_COLORS.textSecondary },
  priceVal: { fontSize: 14, fontWeight: '700', color: THEME_COLORS.text },
  totalLbl: { fontSize: 16, fontWeight: '900', color: THEME_COLORS.text },
  totalVal: { fontSize: 18, fontWeight: '900', color: THEME_COLORS.primary },

  paymentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#F1F5F9' },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentName: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },
  paymentDesc: { fontSize: 12, color: THEME_COLORS.textSecondary, lineHeight: 18 },

  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', height: 56, borderRadius: 28, marginBottom: 24,
    borderWidth: 1.5, borderColor: THEME_COLORS.primary, borderStyle: 'dashed',
  },
  plusCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: THEME_COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addNewTxt: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.primary },

  primaryBtn: {
    backgroundColor: THEME_COLORS.primary, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: THEME_COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});

