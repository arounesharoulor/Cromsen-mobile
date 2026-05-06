import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Platform, StatusBar, Image, Dimensions, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../theme';
import { ArrowLeft, Check, ChevronRight, Plus, Trash2, MapPin, ClipboardList, CreditCard } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { getImageUrl, sanitizeData } from '../services/api';
import { BackIcon } from '../components/CustomIcons';
import { useAuth } from '../context/AuthContext';



const { width } = Dimensions.get('window');

const STEPS = [
  { label: 'Address', icon: <MapPin size={12} color="#FFF" /> },
  { label: 'Order Summary', icon: <ClipboardList size={12} color="#FFF" /> },
  { label: 'Payment', icon: <CreditCard size={12} color="#FFF" /> },
];

/* ─── Add Address Form ─── */
function AddAddressForm({ onSave, initialData }) {
  const [form, setForm] = useState(initialData || {
    firstName: '', countryCode: '+91', mobile: '',
    pincode: '', state: '', city: '',
    line1: '', line2: '', saveAs: 'HOME',
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  const validateAndSave = () => {
    const { firstName, mobile, pincode, state, city, line1 } = form;
    let newErrs = {};
    if (!firstName) newErrs.firstName = 'Required';
    if (!mobile) newErrs.mobile = 'Required';
    if (!pincode) newErrs.pincode = 'Required';
    if (!state) newErrs.state = 'Required';
    if (!city) newErrs.city = 'Required';
    if (!line1) newErrs.line1 = 'Required';

    if (Object.keys(newErrs).length > 0) {
      setErrors(newErrs);
      alert('Please fill out all the required fields in red.');
      return;
    }

    onSave(form);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={f.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={f.formContainer}>

        {[
          { label: 'First name', key: 'firstName', placeholder: 'Enter full name' },
          { label: 'Country Code', key: 'countryCode', placeholder: 'Select your country' },
          { label: 'Mobile Number', key: 'mobile', placeholder: 'Enter mobile number', keyType: 'phone-pad' },
          { label: 'Pincode', key: 'pincode', placeholder: 'Enter pincode', keyType: 'number-pad', half: true },
          { label: 'State', key: 'state', placeholder: 'Enter State', half: true },
          { label: 'City', key: 'city', placeholder: 'Enter city' },
          { label: 'Address Line 1', key: 'line1', placeholder: 'House No, Building Name' },
          { label: 'Address Line 2', key: 'line2', placeholder: 'Street, Area', required: false },
        ].reduce((acc, field, idx, arr) => {
          if (field.half) {
            if (idx > 0 && arr[idx-1]?.half) return acc; // Already rendered as the right side
            const next = arr[idx+1];
            acc.push(
              <View key={field.key} style={f.row}>
                <View style={[f.fieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={f.fieldLabel}>{field.label}<Text style={{color: '#EB5757'}}>*</Text></Text>
                  <TextInput style={[f.field, errors[field.key] && f.fieldError]} placeholder={field.placeholder} value={form[field.key]} onChangeText={(v) => set(field.key, v)} keyboardType={field.keyType || 'default'} />
                  {errors[field.key] && <Text style={f.errorTxt}>{errors[field.key]}</Text>}
                </View>
                {next && next.half && (
                  <View style={[f.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={f.fieldLabel}>{next.label}<Text style={{color: '#EB5757'}}>*</Text></Text>
                    <TextInput style={[f.field, errors[next.key] && f.fieldError]} placeholder={next.placeholder} value={form[next.key]} onChangeText={(v) => set(next.key, v)} keyboardType={next.keyType || 'default'} />
                    {errors[next.key] && <Text style={f.errorTxt}>{errors[next.key]}</Text>}
                  </View>
                )}
              </View>
            );
          } else {
            acc.push(
              <View key={field.key} style={f.fieldGroup}>
                <Text style={f.fieldLabel}>{field.label}{field.required !== false && <Text style={{color: '#EB5757'}}>*</Text>}</Text>
                <TextInput
                  style={[f.field, errors[field.key] && f.fieldError]}
                  placeholder={field.placeholder}
                  placeholderTextColor="#94A3B8"
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
    </KeyboardAvoidingView>
  );
}


export default function CheckoutScreen({ navigation }) {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [step, setStep] = useState(0);
  const [selAddr, setSelAddr] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);


  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem('@UserAddresses');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAddresses(parsed);
        if (parsed.length > 0) setSelAddr(parsed[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveAddress = async (newAddr) => {
    try {
      const formatted = {
        id: editingAddr ? editingAddr.id : Date.now().toString(),
        type: newAddr.saveAs || 'HOME',
        name: newAddr.firstName,
        address: newAddr.line1,
        line2: newAddr.line2,
        city: newAddr.city,
        state: newAddr.state,
        zip: newAddr.pincode,

        phone: `${newAddr.countryCode} ${newAddr.mobile}`,
        full: `${newAddr.line1}, ${newAddr.line2 ? newAddr.line2 + ', ' : ''}${newAddr.city}, ${newAddr.state} - ${newAddr.pincode}`,
        raw: newAddr
      };

      let updated;
      if (editingAddr) {
        updated = addresses.map(a => a.id === editingAddr.id ? formatted : a);
      } else {
        updated = [...addresses, formatted];
      }
      setAddresses(updated);
      await AsyncStorage.setItem('@UserAddresses', JSON.stringify(updated));
      setSelAddr(formatted.id);
      setShowAddForm(false);
      setEditingAddr(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteAddress = async (id) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    await AsyncStorage.setItem('@UserAddresses', JSON.stringify(updated));
    if (selAddr === id) setSelAddr(updated.length > 0 ? updated[0].id : null);
  };


  const subtotal = cartItems.reduce((acc, item) => {
    const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
    return acc + (price * (item.quantity || 1));
  }, 0);
  const discount = 0; // Removing hardcoded discount for now to show correct amount
  const total = subtotal - discount;


  const next = async () => {
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
        const selectedAddress = addresses.find(a => a.id === selAddr);
        const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
        
        const firstItem = cartItems[0] || {};
        const newOrder = {
          id: orderId,
          date: date,
          status: 'ORDER CONFIRMED',
          total: total + 20, // total + shipping
          itemsCount: cartItems.length,
          mainProduct: sanitizeData(firstItem.name || 'Product', 'Product'),
          image: getImageUrl(firstItem.image),
          userId: user?._id || user?.id,
          items: cartItems.map(item => ({
            ...item,
            name: sanitizeData(item.name || 'Product', 'Product'),
            image: getImageUrl(item.image),
            price: typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0)
          })),
          address: selectedAddress,
        };



        const storedOrders = await AsyncStorage.getItem('@UserOrders');
        const orders = storedOrders ? JSON.parse(storedOrders) : [];
        const updatedOrders = [newOrder, ...orders];
        await AsyncStorage.setItem('@UserOrders', JSON.stringify(updatedOrders));

        // Clear cart
        clearCart();

        alert('Order Placed Successfully!');
        navigation.navigate('HomeTab');
      } catch (e) {
        console.error('Error placing order:', e);
        alert('Failed to place order. Please try again.');
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
          <BackIcon color={COLORS.text} size={20} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {showAddForm ? 'Add Address' : step === 0 ? 'Select Delivery Address' : step === 1 ? 'Order Summary' : 'Payment'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {!showAddForm && <StepBar />}

      {showAddForm ? (
        <AddAddressForm onSave={handleSaveAddress} initialData={editingAddr?.raw} />
      ) : step === 0 ? (
        <ScrollView contentContainerStyle={s.content}>
          {addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[s.addrCard, selAddr === addr.id && s.addrCardActive]}
              onPress={() => setSelAddr(addr.id)}
            >
              <View style={s.addrCardHeader}>
                <View style={[s.addrTypeBadge, { backgroundColor: COLORS.secondary }]}>
                  <Text style={s.addrTypeTxt}>{addr.type}</Text>
                </View>
                <View style={[s.radio, selAddr === addr.id && s.radioActive]}>
                  {selAddr === addr.id && <View style={s.radioInner} />}
                </View>
              </View>
              <Text style={s.addrName}>{addr.name}</Text>
              <Text style={s.addrPhone}>{addr.phone}</Text>
              <Text style={s.addrFull}>{addr.full}</Text>
              
              <View style={s.addrActions}>
                <TouchableOpacity onPress={() => { setEditingAddr(addr); setShowAddForm(true); }} style={s.addrActionBtn}>
                  <Text style={s.addrActionTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} style={s.addrActionBtn}>
                  <Text style={[s.addrActionTxt, { color: '#EB5757' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={s.addNewBtn} onPress={() => { setEditingAddr(null); setShowAddForm(true); }}>
            <View style={s.plusCircle}><Plus size={16} color={COLORS.secondary} /></View>
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
            {addresses.find(a => a.id === selAddr) ? (
              <>
                <Text style={s.summaryName}>{addresses.find(a => a.id === selAddr).name}</Text>
                <Text style={s.summaryText}>{addresses.find(a => a.id === selAddr).full}</Text>
                <Text style={s.summaryText}>{addresses.find(a => a.id === selAddr).phone}</Text>
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
                <Text style={s.itemPrice}>₹{item.price} x {item.quantity}</Text>
              </View>
              <Text style={s.itemSubtotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}


          {/* Price Summary */}
          <View style={s.priceSummary}>
            <View style={s.priceRow}><Text style={s.priceLbl}>Subtotal</Text><Text style={s.priceVal}>₹{subtotal}</Text></View>
            <View style={s.priceRow}><Text style={s.priceLbl}>Shipping</Text><Text style={s.priceVal}>₹20</Text></View>
            <View style={s.priceRow}><Text style={s.priceLbl}>Discount</Text><Text style={[s.priceVal, {color: '#27AE60'}]}>-₹{discount}</Text></View>
            <View style={[s.priceRow, {marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'}]}>
              <Text style={s.totalLbl}>Order Total</Text>
              <Text style={s.totalVal}>₹{total + 20}</Text>
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
          
          <TouchableOpacity style={[s.paymentCard, {borderColor: COLORS.secondary}]}>
            <View style={s.paymentHeader}>
              <Text style={s.paymentName}>Cash on Delivery (COD)</Text>
              <View style={s.radioActive}><View style={s.radioInner} /></View>
            </View>
            <Text style={s.paymentDesc}>Pay in cash when your order is delivered to your doorstep.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.paymentCard, {opacity: 0.6}]} disabled>
            <View style={s.paymentHeader}>
              <Text style={s.paymentName}>Online Payment (Coming Soon)</Text>
              <View style={s.radio} />
            </View>
            <Text style={s.paymentDesc}>Credit/Debit Cards, UPI, Netbanking.</Text>
          </TouchableOpacity>

          <View style={s.priceSummary}>
             <View style={s.priceRow}>
              <Text style={s.totalLbl}>Payable Amount</Text>
              <Text style={s.totalVal}>₹{total + 20}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={next}>
            <Text style={s.primaryBtnTxt}>Place Order</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

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
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', paddingVertical: 20, paddingHorizontal: 40,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: COLORS.secondary },
  stepLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  stepLabelActive: { color: COLORS.text },
  stepLine: { width: 40, height: 2, backgroundColor: '#CBD5E1', marginBottom: 15, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.secondary },

  content: { padding: 20, paddingBottom: 40 },
  addrCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  addrCardActive: { borderColor: COLORS.secondary },
  addrCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addrTypeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  addrTypeTxt: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.secondary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary },
  addrName: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  addrPhone: { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 8 },
  addrFull: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  addrActions: { flexDirection: 'row', marginTop: 12, gap: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  addrActionBtn: { paddingVertical: 4 },
  addrActionTxt: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  changeBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.secondary },
  itemCountTxt: { fontSize: 13, color: COLORS.textSecondary },

  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryName: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  summaryText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  itemSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#FFF', padding: 12, borderRadius: 12 },
  itemThumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemPrice: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  priceSummary: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLbl: { fontSize: 14, color: COLORS.textSecondary },
  priceVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalLbl: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  totalVal: { fontSize: 18, fontWeight: '900', color: COLORS.secondary },

  paymentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#F1F5F9' },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  paymentDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', height: 56, borderRadius: 28, marginBottom: 24,
    borderWidth: 1.5, borderColor: COLORS.secondary, borderStyle: 'dashed',
  },
  plusCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addNewTxt: { fontSize: 14, fontWeight: '800', color: COLORS.secondary },

  primaryBtn: {
    backgroundColor: COLORS.secondary, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});

const f = StyleSheet.create({
  scroll: { backgroundColor: '#FFF', flexGrow: 1 },
  formContainer: { padding: 20, paddingBottom: 150 },
  row: { flexDirection: 'row' },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  field: {
    height: 48, borderRadius: 12, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16,
    fontSize: 14, color: COLORS.text,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 12 },
  saveAsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  saveAsChip: {
    flex: 1, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  saveAsChipActive: { backgroundColor: COLORS.secondary },
  saveAsTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  saveBtn: {
    backgroundColor: COLORS.secondary, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
