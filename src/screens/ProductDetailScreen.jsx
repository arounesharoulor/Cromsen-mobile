import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  Dimensions, ActivityIndicator, Modal, Platform, StatusBar, FlatList,
  TextInput, Animated,
} from 'react-native';

import { COLORS } from '../theme';
import { ShoppingCart, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { productService, getImageUrl, sanitizeData } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { CartIcon, CartPlusIcon, FrameIcon, BackIcon, ShareIcon, HeartIcon } from '../components/CustomIcons';






const { width, height } = Dimensions.get('window');

const DEMO_COLORS = ['#8B4513', '#FF4444', '#4466FF', '#22AA44', '#FFD700'];
const COLOR_LABELS = ['Brown', 'Red', 'Blue', 'Green', 'Yellow'];
const SIZE_OPTIONS = ['1/4', '2/4', '3/4', '4/4', '5/4'];

const NUMPAD = [
  ['1','2','3'], ['4','5','6'], ['7','8','9'], ['.','0','⌫'],
];

export default function ProductDetailScreen({ navigation, route }) {
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selColor, setSelColor] = useState(0);
  const [selSize, setSelSize] = useState(2);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyInput, setQtyInput] = useState('1');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [localReviews, setLocalReviews] = useState([]);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted: checkWishlisted } = useWishlist();
  const { user } = useAuth();

  useEffect(() => { if (productId) load(); }, [productId]);

  useEffect(() => {
    if (product) setLocalReviews(product.reviews || []);
  }, [product]);

  const handleSubmitReview = () => {
    if (!reviewText.trim()) return;
    const newRev = {
      name: user?.name || 'Guest User',
      rating: 5,
      time: 'Just now',
      text: reviewText,
      likes: 0,
      dislikes: 0
    };
    setLocalReviews([newRev, ...localReviews]);
    setReviewText('');
  };

  const load = async () => {
    try {
      setLoading(true);
      const d = await productService.getProductById(productId);
      setProduct(d.data || d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleNumpad = (val) => {
    if (val === '⌫') setQtyInput(q => q.length > 1 ? q.slice(0, -1) : '1');
    else setQtyInput(q => q === '1' ? val : q + val);
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: '#FFF' }]}>
      <ActivityIndicator color={COLORS.secondary} size="large" />
    </View>
  );
  if (!product) return (
    <View style={s.center}>
      <Text style={{ color: COLORS.textSecondary }}>Product not found</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        <Text style={{ color: COLORS.primary, fontWeight: '700' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const rawImgs = (
    product.images?.length > 0 ? product.images : 
    (product.image ? [product.image] : 
    (product.thumbnail ? [product.thumbnail] : 
    (product.img ? [product.img] : [])))
  ).filter(Boolean);
  
  const imgs = rawImgs.length > 0 
    ? rawImgs.map(getImageUrl) 
    : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'];

  const price = product.price || 9999;
  const rating = product.ratings || 4.7;

  const HIGHLIGHTS = [
    { k: 'Dimensions', v1: '3.5kg', v2: '3.5kg' },
    { k: '', v1: '2.0kg', v2: '2.5kg' },
    { k: '', v1: '3.0kg', v2: '3.5kg' },
    { k: '', v1: '2.0kg', v2: '2.5kg' },
  ];

  const REVIEWS = localReviews;


  const SIMILAR = [
    { id: 's1', name: 'Honeycomb Insul...', price: 899, image: imgs[0] },
    { id: 's2', name: 'Honeycomb Insul...', price: 899, image: imgs[0] },
    { id: 's3', name: 'Albi...', price: 899, image: imgs[0] },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Floating header */}
      <View style={[s.floatBar, { paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 10 }]}>
        <TouchableOpacity style={s.fab} onPress={() => navigation.goBack()}>
          <BackIcon size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.fabRow}>
          <TouchableOpacity style={s.fab} onPress={() => product && toggleWishlist(product)}>
            <HeartIcon 
              size={16} 
              color={product && checkWishlisted(product._id || product.id) ? COLORS.error : COLORS.text} 
              filled={product && checkWishlisted(product._id || product.id)} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.fab}>
            <ShareIcon color={COLORS.text} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Image Carousel */}
        <View>
          <FlatList
            data={imgs}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImg(newIndex);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={s.mainImg} resizeMode="cover" />
            )}
            keyExtractor={(_, i) => i.toString()}
          />
          
          {/* Dot indicators inside/below image */}
          <View style={s.dots}>
            {imgs.map((_, i) => (
              <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
            ))}
          </View>
        </View>


        <View style={s.card}>
          {/* Color selector */}
          <Text style={s.colorLabel}>
            Color: <Text style={s.colorVal}>{COLOR_LABELS[selColor]}</Text>
          </Text>
          <View style={s.colorRow}>
            {DEMO_COLORS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[s.colorCircle, { backgroundColor: c }, selColor === i && s.colorCircleActive]}
                onPress={() => setSelColor(i)}
              />
            ))}
          </View>

          {/* Size chart */}
          <View style={s.sizeRow}>
            <Text style={s.colorLabel}>Color: </Text>
            {SIZE_OPTIONS.map((sz, i) => (
              <TouchableOpacity
                key={i}
                style={[s.sizeChip, selSize === i && s.sizeChipActive]}
                onPress={() => setSelSize(i)}
              >
                <Text style={[s.sizeChipTxt, selSize === i && { color: '#FFF' }]}>{sz}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.sizeChartLink}>Size Chart</Text>
          </View>

          {/* Product name & rating */}
          <View style={s.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.catName}>Cabinet Hinges Series</Text>
              <Text style={s.productName}>
                {sanitizeData(product.name, 'Product')}
              </Text>
            </View>
            <View style={s.ratingChip}>
              <Text style={s.ratingTxt}>★ {rating}</Text>
            </View>
          </View>

          {/* Add to Cart + Buy Now */}
          <View style={s.ctaRow}>
            <TouchableOpacity
              style={s.addCartBtn}
              onPress={() => setShowQtyModal(true)}
            >
              <CartIcon size={20} color="#1E3C83" />
              <Text style={s.addCartTxt}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.buyNowBtn} onPress={() => navigation.navigate('Checkout')}>
              <Text style={s.buyNowTxt}>Buy Now</Text>
            </TouchableOpacity>
          </View>

          {/* KEY HIGHLIGHTS (collapsible) */}
          <TouchableOpacity style={s.collapseHeader} onPress={() => setHighlightsOpen(!highlightsOpen)}>
            <Text style={s.collapseTitle}>Key Highlights</Text>
            {highlightsOpen ? <ChevronUp size={18} color={COLORS.text} /> : <ChevronDown size={18} color={COLORS.text} />}
          </TouchableOpacity>
          {highlightsOpen && (
            <View style={s.highlightBox}>
              <View style={s.hlHeaderRow}>
                <Text style={s.hlHeader}>Dimensions</Text>
                <Text style={s.hlHeader}>Height</Text>
                <Text style={s.hlHeader}>Weight</Text>
              </View>
              {[
                ['3.5kg', '3.5kg'], ['2.0kg', '2.5kg'],
                ['3.0kg', '3.5kg'], ['2.0kg', '2.5kg'],
              ].map((row, i) => (
                <View key={i} style={s.hlRow}>
                  <Text style={s.hlCell}>{i === 0 ? 'Dimensions' : ''}</Text>
                  <Text style={s.hlCell}>{row[0]}</Text>
                  <Text style={s.hlCell}>{row[1]}</Text>
                </View>
              ))}
            </View>
          )}

          {/* RATINGS & REVIEWS (collapsible) */}
          <TouchableOpacity style={s.collapseHeader} onPress={() => setReviewsOpen(!reviewsOpen)}>
            <Text style={s.collapseTitle}>Ratings & Reviews</Text>
            {reviewsOpen ? <ChevronUp size={18} color={COLORS.text} /> : <ChevronDown size={18} color={COLORS.text} />}
          </TouchableOpacity>
          {reviewsOpen && (
            <View>
              {REVIEWS.map((r, i) => (
                <View key={i} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <View style={s.reviewStarBadge}>
                      <Text style={s.reviewStarBadgeTxt}>★ {r.rating} Good Choice</Text>
                    </View>
                    <Text style={s.reviewTime}>{r.time}</Text>
                  </View>
                  <Text style={s.reviewTxt}>{r.text}</Text>
                  <View style={s.reviewActions}>
                    <Image
                      source={{ uri: 'https://i.pravatar.cc/30?img=' + (i + 5) }}
                      style={s.reviewAvatar}
                    />
                    <Text style={s.reviewerName}>{r.name}</Text>
                    <View style={s.reviewLikes}>
                      <TouchableOpacity style={s.likeBtn}>
                        <ThumbsUp size={12} color={COLORS.textSecondary} />
                        <Text style={s.likeTxt}>{r.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.likeBtn}>
                        <ThumbsDown size={12} color={COLORS.textSecondary} />
                        <Text style={s.likeTxt}>{r.dislikes}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.showAllBtn}>
                <Text style={s.showAllTxt}>Show All Reviews</Text>
              </TouchableOpacity>
              
              <View style={s.addReviewContainer}>
                <TextInput
                  style={s.reviewInput}
                  placeholder="Write a review..."
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                />
                <TouchableOpacity style={s.submitReviewBtn} onPress={handleSubmitReview}>
                  <Text style={s.submitReviewTxt}>Submit Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}


          {/* SIMILAR PRODUCTS */}
          <View style={s.collapseHeader}>
            <Text style={s.collapseTitle}>Similar Products</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {SIMILAR.map((p) => (
              <View key={p.id} style={s.similarCard}>
                <Image source={{ uri: p.image }} style={s.similarImg} />
                <TouchableOpacity style={s.similarHeart}>
                  <HeartIcon size={12} color="#999" />
                </TouchableOpacity>

                <View style={s.similarInfo}>
                  <Text style={s.similarName} numberOfLines={1}>{sanitizeData(p.name, 'Product')}</Text>
                  <View style={s.similarBottom}>
                    <Text style={s.similarPrice}>₹{p.price}</Text>
                    <TouchableOpacity style={s.similarAdd}>
                      <FrameIcon size={14} color="#FFF" />
                    </TouchableOpacity>


                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* QUANTITY MODAL (numpad) */}
      <Modal visible={showQtyModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowQtyModal(false)} />
        <View style={s.modalSheet}>
          <Text style={s.modalTitle}>Enter Quantity</Text>
          <Text style={s.modalSubtitle}>Quantity</Text>
          <View style={s.qtyDisplay}>
            <Text style={s.qtyDisplayTxt}>{qtyInput}</Text>
          </View>
          <View style={s.numpad}>
            {NUMPAD.map((row, ri) => (
              <View key={ri} style={s.numRow}>
                {row.map((val) => (
                  <TouchableOpacity key={val} style={s.numKey} onPress={() => handleNumpad(val)}>
                    <Text style={s.numKeyTxt}>{val}</Text>
                  </TouchableOpacity>
                ))}
                {ri === 0 && <TouchableOpacity style={s.numKeyWide}><Text style={s.numKeyTxt}>←</Text></TouchableOpacity>}
                {ri === 1 && <TouchableOpacity style={s.numKeyWide}><Text style={s.numKeyTxt}>↑</Text></TouchableOpacity>}
                {ri === 2 && <TouchableOpacity style={s.numKeyWide}><Text style={s.numKeyTxt}>↓</Text></TouchableOpacity>}
                {ri === 3 && <TouchableOpacity style={[s.numKeyWide, { backgroundColor: COLORS.primary }]}><Text style={[s.numKeyTxt, { color: '#FFF' }]}>→</Text></TouchableOpacity>}
              </View>
            ))}
          </View>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowQtyModal(false)}>
              <Text style={s.cancelTxt}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => {
                addToCart({
                  id: product._id || product.id,
                  name: product.name,
                  price: product.price || 9999,
                  variant: `Size: ${SIZE_OPTIONS[selSize]}, Color: ${COLOR_LABELS[selColor]}`,
                  image: imgs[activeImg]
                }, parseInt(qtyInput) || 1);
                setShowQtyModal(false);
                navigation.navigate('Cart');
              }}
            >
              <Text style={s.applyTxt}>APPLY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  floatBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  fab: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    marginLeft: 8,
  },
  fabRow: { flexDirection: 'row' },

  mainImg: { width, height: height * 0.45, backgroundColor: '#EEE' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#FFF' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 18 },

  card: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 8 },

  colorLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  colorVal: { fontWeight: '800', color: COLORS.text },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  colorCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: COLORS.primary },

  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  sizeChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  sizeChipActive: { backgroundColor: '#555', borderColor: '#555' },
  sizeChipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  sizeChartLink: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginLeft: 4 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  likeTxt: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },

  showAllBtn: { alignItems: 'center', marginVertical: 10 },
  showAllTxt: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  addReviewContainer: { marginTop: 10, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12 },
  reviewInput: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  submitReviewBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitReviewTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  catName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  productName: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  ratingChip: {
    backgroundColor: '#F0FFF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingTxt: { fontSize: 13, fontWeight: '800', color: '#22C55E' },

  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'space-between', alignItems: 'center' },
  addCartBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FCD7CF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  addCartTxt: { color: '#1E3C83', fontWeight: '900', fontSize: 14 },
  buyNowBtn: {
    width: 175, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F4712F', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 10,
    elevation: 4,
    shadowColor: '#F4712F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  buyNowTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  collapseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  collapseTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },

  highlightBox: { marginBottom: 8 },
  hlHeaderRow: { flexDirection: 'row', paddingVertical: 6, backgroundColor: COLORS.background, borderRadius: 8 },
  hlHeader: { flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, textAlign: 'center' },
  hlRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hlCell: { flex: 1, fontSize: 13, color: COLORS.text, textAlign: 'center' },

  reviewCard: {
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewStarBadge: {
    backgroundColor: '#F0FFF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  reviewStarBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#22C55E' },
  reviewTime: { fontSize: 11, color: COLORS.textSecondary },
  reviewTxt: { fontSize: 13, color: COLORS.text, marginBottom: 8 },
  reviewActions: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  reviewerName: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  reviewLikes: { flexDirection: 'row', gap: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeTxt: { fontSize: 12, color: COLORS.textSecondary },

  showAllBtn: {
    borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 20,
    paddingVertical: 10, alignItems: 'center', marginVertical: 12,
  },
  showAllTxt: { color: COLORS.secondary, fontWeight: '800', fontSize: 14 },

  similarCard: {
    width: 130, backgroundColor: '#FFF', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  similarImg: { width: '100%', height: 100, resizeMode: 'cover' },
  similarHeart: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  similarInfo: { padding: 8 },
  similarName: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  similarBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  similarPrice: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  similarAdd: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  similarAddTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: -1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginBottom: 16 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  qtyDisplay: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
    backgroundColor: COLORS.background,
  },
  qtyDisplayTxt: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  numpad: { gap: 8 },
  numRow: { flexDirection: 'row', gap: 8 },
  numKey: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  numKeyWide: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  numKeyTxt: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelTxt: { fontWeight: '800', color: COLORS.textSecondary, fontSize: 14 },
  applyBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  applyTxt: { fontWeight: '900', color: '#FFF', fontSize: 14 },
});
