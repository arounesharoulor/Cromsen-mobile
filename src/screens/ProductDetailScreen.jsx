import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image,
  Dimensions, ActivityIndicator, Modal, Platform, StatusBar, FlatList,
  TextInput, Animated,
} from 'react-native';

import { THEME_COLORS, FONTS } from '../styling';
import { ShoppingCart, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, ArrowLeft, Plus, Minus } from 'lucide-react-native';
import { productService, getImageUrl, sanitizeData } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartIcon, CartPlusIcon, FrameIcon, BackIcon, ShareIcon, HeartIcon } from '../components/CustomIcons';






const { width, height } = Dimensions.get('window');

const DEMO_THEME_COLORS = ['#8B4513', '#FF4444', '#4466FF', '#22AA44', '#FFD700'];
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
  const [showQtySelector, setShowQtySelector] = useState(false);
  const [qtyInput, setQtyInput] = useState('1');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [localReviews, setLocalReviews] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted: checkWishlisted } = useWishlist();
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  useEffect(() => { if (productId) load(); }, [productId]);

  useEffect(() => {
    if (product) {
      const revs = product.reviews || product.ratingsAndReviews || product.ratingAndReviews || product.productReviews || [];
      setLocalReviews(revs);
      
      // If no reviews in product object, try fetching separately
      if (revs.length === 0) {
        productService.getReviews(product._id || product.id)
          .then(res => {
            const fetchedRevs = Array.isArray(res) ? res : res.data || res.reviews || [];
            mergeLocalReviews(fetchedRevs);
          })
          .catch(err => {
            mergeLocalReviews([]);
          });
      } else {
        mergeLocalReviews(revs);
      }
    }
  }, [product]);

  const mergeLocalReviews = async (backendRevs) => {
    try {
      const pId = product?._id || product?.id;
      const stored = await AsyncStorage.getItem(`@LocalReviews_${pId}`);
      const locals = stored ? JSON.parse(stored) : [];
      
      // Combine and remove duplicates (by text/time)
      const combined = [...locals];
      backendRevs.forEach(br => {
        if (!combined.some(c => c.text === (br.text || br.comment) && c.userId === (br.userId || br.user))) {
          combined.push(br);
        }
      });
      setLocalReviews(combined);
    } catch (e) {
      setLocalReviews(backendRevs);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    const newRev = {
      name: user?.name || 'Guest User',
      username: user?.name || 'Guest User',
      user: user?._id || user?.id || null,
      userId: user?._id || user?.id || null,
      rating: reviewRating,
      comment: reviewText,
      text: reviewText,
      time: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      userImage: user?.image || user?.avatar || null
    };
    
    try {
      if (product) {
        await productService.addReview(product._id || product.id, newRev);
        // Save locally too
        saveReviewLocally(newRev);
        setLocalReviews([newRev, ...localReviews]);
        setReviewText('');
        setReviewRating(5);
      }
    } catch (err) {
      console.warn('Review sync failed, saving locally:', err);
      saveReviewLocally(newRev);
      setLocalReviews([newRev, ...localReviews]);
      setReviewText('');
    }
  };

  const saveReviewLocally = async (rev) => {
    try {
      const pId = product?._id || product?.id;
      const stored = await AsyncStorage.getItem(`@LocalReviews_${pId}`);
      const locals = stored ? JSON.parse(stored) : [];
      const updated = [rev, ...locals];
      await AsyncStorage.setItem(`@LocalReviews_${pId}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const load = async () => {
    try {
      setLoading(true);
      const d = await productService.getProductById(productId);
      const mainProd = d.data || d;
      setProduct(mainProd);
      
      // Fetch similar products based on category
      const catId = mainProd.category?.[0]?._id || mainProd.category?.[0] || mainProd.categoryId;
      if (catId) {
        const sim = await productService.getProducts({ category: catId, limit: 6 });
        const list = Array.isArray(sim) ? sim : sim.data || sim.products || [];
        // Filter out current product
        setSimilarProducts(list.filter(p => (p._id || p.id) !== productId));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleNumpad = (val) => {
    if (val === '⌫') setQtyInput(q => q.length > 1 ? q.slice(0, -1) : '1');
    else setQtyInput(q => q === '1' ? val : q + val);
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.secondary} size="large" />
    </View>
  );
  if (!product) return (
    <View style={[s.center, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textSecondary }}>Product not found</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        <Text style={{ color: theme.primary, fontWeight: '700' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const categoryImage = (Array.isArray(product.category) && product.category[0]?.image) || 
                        (product.category?.image) || null;

  const rawImgs = (
    (product.images?.length > 0 ? product.images : null) || 
    (product.image ? [product.image] : null) || 
    (product.imageUrl ? [product.imageUrl] : null) || 
    (product.imagePath ? [product.imagePath] : null) || 
    (product.thumbnail ? [product.thumbnail] : null) || 
    (product.img ? [product.img] : null) || 
    (product.pic ? [product.pic] : null) || 
    (product.photo ? [product.photo] : null) || 
    (categoryImage ? [categoryImage] : null) ||
    []
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
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Floating header */}
      <View style={[s.floatBar, { paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 10 }]}>
        <TouchableOpacity style={[s.fab, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={s.fabRow}>
          <TouchableOpacity style={[s.fab, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]} onPress={() => product && toggleWishlist(product)}>
            <HeartIcon 
              size={16} 
              color={product && checkWishlisted(product._id || product.id) ? theme.error : theme.text} 
              filled={product && checkWishlisted(product._id || product.id)} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={[s.fab, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]}>
            <ShareIcon color={theme.text} size={16} />
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
          <View style={[s.dots, { backgroundColor: theme.background }]}>
            {imgs.map((_, i) => (
              <View key={i} style={[s.dot, { backgroundColor: theme.border }, i === activeImg && { backgroundColor: theme.primary, width: 18 }]} />
            ))}
          </View>
        </View>


        <View style={[s.card, { backgroundColor: theme.background }]}>
          {/* Color selector */}
          <Text style={[s.colorLabel, { color: theme.textSecondary }]}>
            Color: <Text style={[s.colorVal, { color: theme.text }]}>{COLOR_LABELS[selColor]}</Text>
          </Text>
          <View style={s.colorRow}>
            {DEMO_THEME_COLORS.map((c, i) => (
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
              <Text style={[s.catName, { color: theme.textSecondary }]}>Cabinet Hinges Series</Text>
              <Text style={[s.productName, { color: theme.text }]}>
                {sanitizeData(product.name, 'Product')}
              </Text>
            </View>
            <View style={s.priceRatingRow}>
              <Text style={[s.priceTxt, { color: theme.primary }]}>₹{price.toLocaleString()}</Text>
              <View style={[s.ratingChip, { backgroundColor: isDarkMode ? '#064E3B' : '#F0FFF4' }]}>
                <Text style={[s.ratingTxt, { color: isDarkMode ? '#10B981' : '#22C55E' }]}>★ {rating}</Text>
              </View>
            </View>
          </View>

          {/* Add to Cart + Buy Now */}
          <View style={s.ctaRow}>
            {showQtySelector ? (
              <View style={s.inlineQtySelector}>
                <TouchableOpacity 
                  style={s.inlineQtyBtn} 
                  onPress={() => {
                    const q = parseInt(qtyInput) || 1;
                    if (q > 1) setQtyInput(String(q - 1));
                    else setShowQtySelector(false);
                  }}
                >
                  <Minus size={20} color={THEME_COLORS.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity style={s.inlineQtyDisplay} onPress={() => setShowQtyModal(true)}>
                  <Text style={s.inlineQtyTxt}>{qtyInput}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={s.inlineQtyBtn} 
                  onPress={() => {
                    const q = parseInt(qtyInput) || 1;
                    setQtyInput(String(q + 1));
                  }}
                >
                  <Plus size={20} color={THEME_COLORS.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={s.addCartBtn}
                onPress={() => {
                  setShowQtySelector(true);
                  // Optionally add to cart immediately with qty 1
                  addToCart({
                    id: product._id || product.id,
                    name: product.name,
                    price: product.price || 9999,
                    variant: `Size: ${SIZE_OPTIONS[selSize]}, Color: ${COLOR_LABELS[selColor]}`,
                    image: imgs[activeImg]
                  }, 1);
                }}
              >
                <CartIcon size={20} color={THEME_COLORS.primary} />
                <Text style={s.addCartTxt}>Add to Cart</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.buyNowBtn} onPress={() => {
              const directItem = {
                id: product._id || product.id,
                _id: product._id || product.id,
                name: product.name,
                price: product.price || 9999,
                variant: `Size: ${SIZE_OPTIONS[selSize]}, Color: ${COLOR_LABELS[selColor]}`,
                image: imgs[activeImg],
                quantity: 1
              };
              navigation.navigate('Checkout', { directItem });
            }}>
              <Text style={s.buyNowTxt}>Buy Now</Text>
            </TouchableOpacity>
          </View>

          {/* KEY HIGHLIGHTS (collapsible) */}
          <TouchableOpacity style={s.collapseHeader} onPress={() => setHighlightsOpen(!highlightsOpen)}>
            <Text style={s.collapseTitle}>Key Highlights</Text>
            {highlightsOpen ? <ChevronUp size={18} color={THEME_COLORS.text} /> : <ChevronDown size={18} color={THEME_COLORS.text} />}
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
            {reviewsOpen ? <ChevronUp size={18} color={THEME_COLORS.text} /> : <ChevronDown size={18} color={THEME_COLORS.text} />}
          </TouchableOpacity>
          {reviewsOpen && (
            <View>
              {localReviews.map((r, i) => (
                <View key={i} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <View style={s.reviewStarBadge}>
                      <Text style={s.reviewStarBadgeTxt}>★ {r.rating} Good Choice</Text>
                    </View>
                    <Text style={s.reviewTime}>{r.time}</Text>
                  </View>
                  <Text style={s.reviewTxt}>{r.comment || r.text}</Text>
                  <View style={s.reviewActions}>
                    {(r.userImage || r.image || r.avatar) ? (
                      <Image
                        source={{ uri: getImageUrl(r.userImage || r.image || r.avatar) }}
                        style={s.reviewAvatar}
                      />
                    ) : null}
                    <Text style={s.reviewerName}>{r.name || r.username || 'Guest User'}</Text>
                    <View style={s.reviewLikes}>
                      <TouchableOpacity style={s.likeBtn}>
                        <ThumbsUp size={12} color={THEME_COLORS.textSecondary} />
                        <Text style={s.likeTxt}>{r.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.likeBtn}>
                        <ThumbsDown size={12} color={THEME_COLORS.textSecondary} />
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
                <Text style={s.addReviewTitle}>Write a Review</Text>
                
                {/* Star Picker */}
                <View style={s.starPicker}>
                  {[1, 2, 3, 4, 5].map((sNum) => (
                    <TouchableOpacity key={sNum} onPress={() => setReviewRating(sNum)}>
                      <Text style={[s.pickerStar, sNum <= reviewRating && s.pickerStarActive]}>
                        {sNum <= reviewRating ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={s.ratingHint}>{reviewRating} / 5 stars</Text>
                </View>

                <TextInput
                  style={s.reviewInput}
                  placeholder="Tell others what you think..."
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
            {similarProducts.map((p) => (
              <TouchableOpacity 
                key={p._id || p.id} 
                style={s.similarCard}
                onPress={() => navigation.push('ProductDetail', { productId: p._id || p.id })}
              >
                <Image source={{ uri: getImageUrl(p.image || p.thumbnail) }} style={s.similarImg} />
                <TouchableOpacity style={s.similarHeart} onPress={() => toggleWishlist(p)}>
                  <HeartIcon 
                    size={12} 
                    color={checkWishlisted(p._id || p.id) ? THEME_COLORS.error : THEME_COLORS.textSecondary} 
                    filled={checkWishlisted(p._id || p.id)}
                  />
                </TouchableOpacity>

                <View style={s.similarInfo}>
                  <Text style={s.similarName} numberOfLines={1}>{sanitizeData(p.name, 'Product')}</Text>
                  <View style={s.similarBottom}>
                    <Text style={s.similarPrice}>₹{(p.price || 0).toLocaleString()}</Text>
                    <TouchableOpacity 
                      style={s.similarAdd}
                      onPress={() => {
                        addToCart({
                          ...p,
                          id: p._id || p.id,
                          image: getImageUrl(p.image || p.thumbnail)
                        }, 1);
                      }}
                    >
                      <FrameIcon size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
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
                {ri === 3 && <TouchableOpacity style={[s.numKeyWide, { backgroundColor: THEME_COLORS.primary }]}><Text style={[s.numKeyTxt, { color: '#FFF' }]}>→</Text></TouchableOpacity>}
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
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: THEME_COLORS.border },
  dotActive: { backgroundColor: THEME_COLORS.primary, width: 18 },

  card: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 8 },

  colorLabel: { fontSize: 13, fontWeight: '600', color: THEME_COLORS.textSecondary, marginBottom: 8 },
  colorVal: { fontWeight: '800', color: THEME_COLORS.text },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  colorCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: THEME_COLORS.primary },

  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  sizeChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: THEME_COLORS.background, borderWidth: 1, borderColor: THEME_COLORS.border,
  },
  sizeChipActive: { backgroundColor: '#555', borderColor: '#555' },
  sizeChipTxt: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text },
  sizeChartLink: { fontSize: 12, color: THEME_COLORS.primary, fontWeight: '700', marginLeft: 4 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  likeTxt: { fontSize: 11, fontWeight: '700', color: THEME_COLORS.textSecondary },

  showAllBtn: { alignItems: 'center', marginVertical: 10 },
  showAllTxt: { fontSize: 13, fontWeight: '800', color: THEME_COLORS.primary },

  addReviewContainer: { marginTop: 10, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  addReviewTitle: { fontSize: 14, fontWeight: '800', color: THEME_COLORS.text, marginBottom: 10 },
  starPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  pickerStar: { fontSize: 24, color: '#CBD5E1' },
  pickerStarActive: { color: '#FACC15' },
  ratingHint: { fontSize: 12, color: THEME_COLORS.textSecondary, fontWeight: '600', marginLeft: 8 },
  reviewInput: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, fontSize: 13 },
  submitReviewBtn: { backgroundColor: THEME_COLORS.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  submitReviewTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  catName: { fontSize: 12, color: THEME_COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  productName: {
    fontFamily: FONTS.family,
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.text,
    marginTop: 4,
  },
  priceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  priceTxt: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME_COLORS.primary,
    fontFamily: FONTS.family,
  },
  ratingChip: {
    backgroundColor: '#F0FFF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingTxt: { fontSize: 13, fontWeight: '800', color: '#22C55E' },

  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'space-between', alignItems: 'center' },
  addCartBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: THEME_COLORS.cartBtn,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  addCartTxt: { color: THEME_COLORS.primary, fontWeight: '900', fontSize: 14 },
  buyNowBtn: {
    width: 175, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME_COLORS.secondary, borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 10,
    elevation: 4,
    shadowColor: THEME_COLORS.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8,
  },
  buyNowTxt: { color: THEME_COLORS.surface, fontWeight: '900', fontSize: 14 },

  inlineQtySelector: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME_COLORS.cartBtn, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1.5, borderColor: THEME_COLORS.primary,
  },
  inlineQtyBtn: {
    width: 44, height: '100%', justifyContent: 'center', alignItems: 'center',
  },
  inlineQtyDisplay: {
    flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF',
  },
  inlineQtyTxt: {
    fontSize: 16, fontWeight: '900', color: THEME_COLORS.primary,
  },

  collapseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: THEME_COLORS.border,
  },
  collapseTitle: { fontSize: 15, fontWeight: '800', color: THEME_COLORS.text },

  highlightBox: { marginBottom: 8 },
  hlHeaderRow: { flexDirection: 'row', paddingVertical: 6, backgroundColor: THEME_COLORS.background, borderRadius: 8 },
  hlHeader: { flex: 1, fontSize: 12, fontWeight: '800', color: THEME_COLORS.textSecondary, textAlign: 'center' },
  hlRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: THEME_COLORS.border },
  hlCell: { flex: 1, fontSize: 13, color: THEME_COLORS.text, textAlign: 'center' },

  reviewCard: {
    backgroundColor: THEME_COLORS.background, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewStarBadge: {
    backgroundColor: '#F0FFF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  reviewStarBadgeTxt: { fontSize: 12, fontWeight: '800', color: '#22C55E' },
  reviewTime: { fontSize: 11, color: THEME_COLORS.textSecondary },
  reviewTxt: { fontSize: 13, color: THEME_COLORS.text, marginBottom: 8 },
  reviewActions: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6 },
  reviewerName: { flex: 1, fontSize: 12, color: THEME_COLORS.textSecondary, fontWeight: '600' },
  reviewLikes: { flexDirection: 'row', gap: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeTxt: { fontSize: 12, color: THEME_COLORS.textSecondary },

  showAllBtn: {
    borderWidth: 1, borderColor: THEME_COLORS.secondary, borderRadius: 20,
    paddingVertical: 10, alignItems: 'center', marginVertical: 12,
  },
  showAllTxt: { color: THEME_COLORS.secondary, fontWeight: '800', fontSize: 14 },

  similarCard: {
    width: 130, backgroundColor: '#FFF', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: THEME_COLORS.border,
  },
  similarImg: { width: '100%', height: 100, resizeMode: 'cover' },
  similarHeart: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  similarInfo: { padding: 8 },
  similarName: { fontSize: 12, fontWeight: '700', color: THEME_COLORS.text, marginBottom: 4 },
  similarBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  similarPrice: { fontSize: 13, fontWeight: '900', color: THEME_COLORS.text },
  similarAdd: {
    width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  similarAddTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: -1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '900', color: THEME_COLORS.text, textAlign: 'center', marginBottom: 16 },
  modalSubtitle: { fontSize: 13, color: THEME_COLORS.textSecondary, marginBottom: 8 },
  qtyDisplay: {
    borderWidth: 1, borderColor: THEME_COLORS.border, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
    backgroundColor: THEME_COLORS.background,
  },
  qtyDisplayTxt: { fontSize: 18, fontWeight: '800', color: THEME_COLORS.text },
  numpad: { gap: 8 },
  numRow: { flexDirection: 'row', gap: 8 },
  numKey: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: THEME_COLORS.background, borderWidth: 1, borderColor: THEME_COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  numKeyWide: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: THEME_COLORS.background, borderWidth: 1, borderColor: THEME_COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  numKeyTxt: { fontSize: 16, fontWeight: '700', color: THEME_COLORS.text },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: THEME_COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelTxt: { fontWeight: '800', color: THEME_COLORS.textSecondary, fontSize: 14 },
  applyBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: THEME_COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  applyTxt: { fontWeight: '900', color: '#FFF', fontSize: 14 },
});
