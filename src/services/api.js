import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
export const BASE_URL = Constants.manifest?.extra?.backendUrl || process.env.REACT_NATIVE_BACKEND_URL || 'https://api.cromsennest.com/api';

// Helper: read the JWT stored after login without importing React-Native context
const getStoredToken = async () => {
  try {
    const raw = await AsyncStorage.getItem('@AuthData');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.token || null;
  } catch (e) { 
    console.warn("Failed to get stored token", e);
    return null; 
  }
};

export const authHeaders = async (extra = {}) => {
  const token = await getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}) at ${response.method || ''} ${response.url}: The server returned an unexpected response (possibly HTML).`);
    }
    return text;
  }

  if (!response.ok) {
    throw new Error(data?.message || `Error ${response.status} at ${response.url}: ${data?.error || 'Something went wrong'}`);
  }
  return data;
};

export const getImageUrl = (imagePath) => {
  // If it's an array, take the first valid element
  if (Array.isArray(imagePath)) {
    const firstValid = imagePath.find(item => item && item !== '');
    if (firstValid) return getImageUrl(firstValid);
    return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';
  }

  // If it's an object, try common URL properties
  if (imagePath && typeof imagePath === 'object') {
    const url = imagePath.url || imagePath.imageURL || imagePath.secure_url ||
      imagePath.uri || imagePath.src || imagePath.path || '';
    return getImageUrl(url);
  }

  // Not a string or empty
  if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
    return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';
  }

  const path = imagePath.trim();

  // Already a full URL (Cloudinary, S3, etc.) — return as-is
  // Replace localhost with backend for dev-uploaded images
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (path.includes('localhost') || path.includes('127.0.0.1')) {
      return path.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://api.cromsennest.com');
    }
    return path;
  }

  // Base64 image
  if (path.startsWith('data:image')) return path;

  // Relative path — prepend backend base URL
  const baseUrl = 'https://api.cromsennest.com';
  const cleanPath = path.replace(/\\/g, '/');
  return `${baseUrl}/${cleanPath.replace(/^\/+/, '')}`;
};


export const sanitizeData = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.name || val.title || val.label || JSON.stringify(val);
  }
  return String(val);
};

export const authService = {
  login: async (email, password) => {
    const response = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },
  register: async (userData) => {
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
  // Send an email OTP using backend nodemailer integration
  // Simplified OTP request – backend generates OTP itself
  sendEmailOtp: async (email) => {
    const url = `${BASE_URL}/users/send-otp`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },
  getProfile: async (userId) => {
    const headers = await authHeaders();
    const response = await fetch(`${BASE_URL}/users/${userId}/profile`, { headers });
    return handleResponse(response);
  },
};

export const productService = {
  // Normalize a single product object to include canonical installation fields
  _normalizeProduct: (p) => {
    if (!p || typeof p !== 'object') return p;
    const installationRatePerSqFt = (typeof p.installationRatePerSqFt === 'number')
      ? p.installationRatePerSqFt
      : (parseFloat(p.installationRatePerSqFt || p.installationRatePerSqft || p.installationPricePerSqft || p.installationPerSqFt || p.installationRate || p.installationRatePerSquareFoot) || 0);

    const baseInstallationPrice = (typeof p.baseInstallationPrice === 'number')
      ? p.baseInstallationPrice
      : (parseFloat(p.installationPrice || p.installationFee || p.installationCost || p.baseInstallationPrice || 0) || 0);

    return { ...p, installationRatePerSqFt, baseInstallationPrice };
  },

  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const headers = await authHeaders();
    const response = await fetch(`${BASE_URL}/products?${query}`, { headers });
    const data = await handleResponse(response);
    // Normalize list shapes
    if (Array.isArray(data)) return data.map(productService._normalizeProduct);
    const list = data.products || data.data || [];
    if (Array.isArray(list)) return { ...data, products: list.map(productService._normalizeProduct) };
    return productService._normalizeProduct(data);
  },
  getProductById: async (id) => {
    // Add timestamp to bypass potential caching issues
    const headers = await authHeaders();
    const response = await fetch(`${BASE_URL}/products/${id}?t=${Date.now()}`, { headers });
    const data = await handleResponse(response);
    // If wrapped response with data/product
    const prod = data.data || data.product || data;
    return productService._normalizeProduct(prod);
  },
  searchProducts: async (query) => {
    let rawList = [];
    const headers = await authHeaders();
    
    // Attempt 1: search endpoint
    try {
      const response = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query)}&keyword=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          rawList = Array.isArray(data) ? data : data.products || data.data || [];
        }
      }
    } catch (e) {
      console.warn("Search endpoint failed, trying fallback...", e);
    }

    // Attempt 2: fallback search query on products endpoint
    if (!Array.isArray(rawList) || rawList.length === 0) {
      try {
        const response = await fetch(`${BASE_URL}/products?search=${encodeURIComponent(query)}&keyword=${encodeURIComponent(query)}`);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            rawList = Array.isArray(data) ? data : data.products || data.data || [];
          }
        }
      } catch (e) {
        console.warn("Fallback search endpoint failed, trying full fetch...", e);
      }
    }

    // Attempt 3: Fetch all products and filter locally
    if (!Array.isArray(rawList) || rawList.length === 0) {
      try {
        const response = await fetch(`${BASE_URL}/products?limit=1000`, { headers });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            rawList = Array.isArray(data) ? data : data.products || data.data || [];
          }
        }
      } catch (e) {
        console.error("Full fetch failed", e);
      }
    }

    // Process and filter results locally
    if (!Array.isArray(rawList)) {
      rawList = typeof rawList === 'object' && rawList ? [rawList] : [];
    }
    
    const list = rawList.map(productService._normalizeProduct);
    if (!query) return list;

    const keywords = query.toLowerCase().trim().split(/\s+/);
    
    // Helper to match if any word in the text starts with the keyword
    const startsWithKeyword = (text, kw) => {
      if (!text) return false;
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escapedKw}`, 'i').test(String(text));
    };

    const filteredList = list.filter(p => {
      if (!p) return false;
      
      return keywords.every(kw => {
        const nameMatch = startsWithKeyword(p.name, kw);
        const descMatch = startsWithKeyword(p.description, kw);
        let catMatch = false;
        if (p.category) {
          if (typeof p.category === 'string') {
            catMatch = startsWithKeyword(p.category, kw);
          } else if (Array.isArray(p.category)) {
            catMatch = p.category.some(c => 
              c && (typeof c === 'string' 
                ? startsWithKeyword(c, kw) 
                : startsWithKeyword(c.name, kw)
              )
            );
          } else if (p.category.name) {
            catMatch = startsWithKeyword(p.category.name, kw);
          }
        }
        return nameMatch || descMatch || catMatch;
      });
    });

    // Sort to prioritize products that start exactly with the search query
    const exactQuery = query.toLowerCase().trim();
    filteredList.sort((a, b) => {
      const aStarts = a.name && String(a.name).toLowerCase().startsWith(exactQuery) ? 1 : 0;
      const bStarts = b.name && String(b.name).toLowerCase().startsWith(exactQuery) ? 1 : 0;
      return bStarts - aStarts;
    });

    return filteredList;
  },
  addReview: async (productId, reviewData) => {
    const hasMedia = reviewData.localMedia && reviewData.localMedia.length > 0;
    
    const endpoints = [
      { url: `${BASE_URL}/products/${productId}/reviews`, method: 'POST' },
      { url: `${BASE_URL}/reviews`, method: 'POST' },
      { url: `${BASE_URL}/product-reviews`, method: 'POST' },
      { url: `${BASE_URL}/products/reviews/${productId}`, method: 'POST' },
    ];

    let lastError;
    for (const ep of endpoints) {
      try {
        console.log(`Trying Review Sync: ${ep.method} ${ep.url}`);
        let options;
        if (hasMedia) {
          const formData = new FormData();
          formData.append('productId', productId);
          formData.append('rating', String(reviewData.rating || 5));
          formData.append('comment', reviewData.comment || '');
          formData.append('userName', reviewData.userName || reviewData.name || 'Anonymous');
          formData.append('title', reviewData.title || '');
          
          reviewData.localMedia.forEach((uri, index) => {
            formData.append('images', {
              uri: uri,
              type: 'image/jpeg',
              name: `review_${index}.jpg`
            });
          });

          const headers = await authHeaders();
          delete headers['Content-Type']; // Let fetch set boundary

          options = {
            method: ep.method,
            headers: headers,
            body: formData,
          };
        } else {
          options = {
            method: ep.method,
            headers: await authHeaders(),
            body: JSON.stringify({ ...reviewData, productId }),
          };
        }

        const response = await fetch(ep.url, options);
        if (response.ok) {
          console.log(`Review Sync SUCCESS: ${ep.url}`);
          return await handleResponse(response);
        }
        console.log(`Review Sync Failed (${response.status}): ${ep.url}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Failed to submit review after multiple attempts');
  },
  getReviews: async (productId, productName = '') => {
    const endpoints = [
      `${BASE_URL}/products/${productId}/reviews`,
      `${BASE_URL}/products/reviews/${productId}`,
      `${BASE_URL}/reviews/product/${productId}`,
      `${BASE_URL}/reviews/products/${productId}`,
      `${BASE_URL}/product-reviews/product/${productId}`,
      `${BASE_URL}/product-reviews/${productId}`,
      `${BASE_URL}/product-reviews?productId=${productId}`,
      `${BASE_URL}/product-reviews?product=${productId}`,
      `${BASE_URL}/product-reviews`,
      `${BASE_URL}/reviews?product=${productId}`,
      `${BASE_URL}/reviews?productId=${productId}`,
      `${BASE_URL}/reviews/${productId}`,
      `${BASE_URL}/reviews`, // Fallback plural global

      // Singular versions
      `${BASE_URL}/review?product=${productId}`,
      `${BASE_URL}/review?productId=${productId}`,
      `${BASE_URL}/review/${productId}`,
      `${BASE_URL}/review`, // Fallback singular global
      `${BASE_URL}/product-review?productId=${productId}`,
      `${BASE_URL}/product-review?product=${productId}`,
      `${BASE_URL}/product-review/${productId}`,
      `${BASE_URL}/product-review` // Fallback singular global
    ];
    for (const url of endpoints) {
      try {
        console.log(`[REVIEWS] Fetching from: GET ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          const resData = await handleResponse(response);
          const rawList = Array.isArray(resData) ? resData : (resData.data || resData.reviews || []);
          console.log(`[REVIEWS] GET ${url} returned ${rawList.length} raw reviews`);

          if (
            url === `${BASE_URL}/reviews` ||
            url === `${BASE_URL}/product-reviews` ||
            url === `${BASE_URL}/review` ||
            url === `${BASE_URL}/product-review`
          ) {
            console.log(`[REVIEWS] Filtering global reviews for productId: ${productId} / name: ${productName}`);
            const filtered = rawList.filter(r => {
              const rProdId = r.productId || r.product || (r.product?._id || r.product?.id || '');
              const idMatch = rProdId && String(rProdId) === String(productId);

              const rName = r.productName || r.product?.name || r.name || '';
              const exactNameMatch = rName && productName &&
                String(rName).toLowerCase().trim() === String(productName).toLowerCase().trim();

              const substringMatch = rName && productName && (
                String(rName).toLowerCase().includes(String(productName).toLowerCase().trim()) ||
                String(productName).toLowerCase().includes(String(rName).toLowerCase().trim())
              );

              const rKeywords = String(rName).toLowerCase().split(/[\s\-_,\.\/]+/).filter(w => w.length > 2);
              const pKeywords = String(productName).toLowerCase().split(/[\s\-_,\.\/]+/).filter(w => w.length > 2);
              const keywordOverlap = rKeywords.some(w => pKeywords.includes(w)) || pKeywords.some(w => rKeywords.includes(w));

              return idMatch || exactNameMatch || substringMatch || keywordOverlap;
            });
            console.log(`[REVIEWS] Found ${filtered.length} matching reviews after global filter`);
            return filtered;
          }

          return rawList;
        } else {
          console.log(`[REVIEWS] GET ${url} failed with status: ${response.status}`);
        }
      } catch (e) {
        console.warn(`[REVIEWS] Fetch error for ${url}:`, e);
      }
    }
    return [];
  },
};

export const categoryService = {
  getCategories: async () => {
    const response = await fetch(`${BASE_URL}/categories`);
    return handleResponse(response);
  },
};

export const homepageService = {
  getHomepageData: async () => {
    const response = await fetch(`${BASE_URL}/homepage`);
    return handleResponse(response);
  },
};
export const userService = {
  sendStatusEmail: async (email, statusType, details = {}) => {
    if (!email) return;
    try {
      console.log(`[Email Service] Attempting to send ${statusType} email to ${email}`);
      const headers = await authHeaders();
      const response = await fetch(`${BASE_URL}/users/send-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, type: statusType, details }),
      });
      if (response.ok) {
        console.log(`✅ [Email Service] ${statusType} email sent successfully`);
      } else {
        console.warn(`[Email Service] Failed to send email (backend might not support this yet)`);
      }
    } catch (e) {
      console.warn(`[Email Service] Error sending email:`, e);
    }
  },

  // Addresses: stored inside the user doc — fetch all users, find by ID, PATCH to update
  updateProfile: async (userId, userData, token) => {
    // Based on userroute.js: router.put('/:id/profile', userController.updateUserProfile);
    const url = `${BASE_URL}/users/${userId}/profile`;

    try {
      console.log(`[SYNC] Updating Profile: PUT ${url}`);
      
      const headers = await authHeaders();
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log(`[SYNC] Profile Update SUCCESS`);
        return await handleResponse(response);
      }

      const clonedResp = response.clone();
      const errData = await clonedResp.json().catch(() => ({}));
      const errMsg = errData.message || JSON.stringify(errData) || '';
      console.log(`[SYNC] Profile Update Failed (${response.status}):`, errData);

      if (response.status === 400 && (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('required'))) {
        console.warn('[SYNC] Backend requires password for profile update. Proceeding with local-only update.');
        return { success: true, localOnly: true };
      }

      // If it's a 404 or other error, handle it properly
      return await handleResponse(response);
    } catch (error) {
      console.error('Update profile error:', error);
      // We don't re-throw if it's already a handled local-only case
      if (error.message?.includes('locally')) return { success: true };
      throw error;
    }
  },

  getAddresses: async (userId) => {
    if (!userId) return [];
    try {
      const headers = await authHeaders();
      const response = await fetch(`${BASE_URL}/users/${userId}/profile`, { headers });
      if (response.ok) {
        const data = await response.json();
        const user = data.user || data.data || data;

        return (user?.addresses || []).map(a => ({
          id: a._id || String(Date.now()),
          name: a.name || '',
          address: a.street || a.address || '',
          city: a.city || '',
          state: a.state || '',
          zip: a.zip || '',
          phone: a.phone || '',
          type: a.saveAs || 'HOME',
          full: `${a.street || a.address || ''}, ${a.city}, ${a.state} - ${a.zip}`,
        }));
      }

      // Fallback: list users and find (only if direct profile fails)
      const listResp = await fetch(`${BASE_URL}/users`);
      if (listResp.ok) {
        const listData = await listResp.json();
        const users = Array.isArray(listData) ? listData : listData.users || [];
        const user = users.find(u => u._id === userId || u.id === userId);

        return (user?.addresses || []).map(a => ({
          id: a._id || String(Date.now()),
          name: a.name || '',
          address: a.street || a.address || '',
          city: a.city || '',
          state: a.state || '',
          zip: a.zip || '',
          phone: a.phone || '',
          type: a.saveAs || 'HOME',
          full: `${a.street || a.address || ''}, ${a.city}, ${a.state} - ${a.zip}`,
        }));
      }

      return [];
    } catch (e) {
      console.warn('Addresses fetch failed:', e);
      return [];
    }
  },

  addAddress: async (userId, addressData, password = null) => {
    const backendAddr = {
      name: addressData.name || addressData.firstName || '',
      street: addressData.address || addressData.line1 || '',
      city: addressData.city || '',
      state: addressData.state || '',
      zip: addressData.zip || addressData.pincode || '',
      phone: addressData.phone || '',
      isDefault: false,
      saveAs: addressData.type || addressData.saveAs || 'HOME',
    };

    try {
      // 1. Get current user data to merge addresses
      console.log(`[SYNC] Fetching current user for address merge: GET ${BASE_URL}/users/${userId}/profile`);
      const headers = await authHeaders();
      const getResp = await fetch(`${BASE_URL}/users/${userId}/profile`, { headers });
      let user;
      if (getResp.ok) {
        const data = await getResp.json();
        user = data.user || data.data || data;
      } else {
        // Fallback to fetch from users list
        const listResp = await fetch(`${BASE_URL}/users`);
        const listData = await listResp.json();
        const users = Array.isArray(listData) ? listData : listData.users || [];
        user = users.find(u => u._id === userId || u.id === userId);
      }

      if (!user) throw new Error('User not found for address sync');

      let updatedAddresses = [];
      const currentAddresses = user.addresses || [];
      const targetId = addressData.id || addressData._id;
      let matched = false;

      if (targetId) {
        updatedAddresses = currentAddresses.map(addr => {
          if (addr._id === targetId || addr.id === targetId) {
            matched = true;
            return { ...addr, ...backendAddr };
          }
          return addr;
        });
      }

      if (!matched) {
        // Fallback: search by similar address details (street, city, zip) to avoid duplicates
        const existingIdx = currentAddresses.findIndex(addr =>
          (addr.street || '').toLowerCase() === (backendAddr.street || '').toLowerCase() &&
          (addr.city || '').toLowerCase() === (backendAddr.city || '').toLowerCase() &&
          (addr.zip || '') === (backendAddr.zip || '')
        );

        if (existingIdx !== -1) {
          updatedAddresses = [...currentAddresses];
          updatedAddresses[existingIdx] = { ...updatedAddresses[existingIdx], ...backendAddr };
        } else {
          updatedAddresses = [...currentAddresses, backendAddr];
        }
      }

      // 2. Push updated addresses to backend
      const updateUrl = `${BASE_URL}/users/${userId}/profile`;
      console.log(`[SYNC] Syncing Addresses: PUT ${updateUrl}`);
      const updateBody = { addresses: updatedAddresses };
      if (password) updateBody.currentPassword = password;

      const updateResp = await fetch(updateUrl, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify(updateBody),
      });

      if (updateResp.ok) {
        console.log(`[SYNC] Address Sync SUCCESS`);
        return await handleResponse(updateResp);
      }

      const clonedResp = updateResp.clone();
      const errData = await clonedResp.json().catch(() => ({}));
      const errMsg = errData.message || '';
      if (updateResp.status === 400 && (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('required'))) {
        console.warn('[SYNC] Backend requires password for profile address update. Skipping backend sync, using local state.');
        return { success: true, localOnly: true };
      }

      // If all else fails, handle error normally
      return await handleResponse(updateResp);
    } catch (e) {
      console.warn('Add address error:', e);
      // Don't crash the UI if it's a known sync limitation
      if (e.message?.includes('locally')) return { success: true };
      throw e;
    }
  },

  deleteAddress: async (userId, addressId, password = null) => {
    const usersResp = await fetch(`${BASE_URL}/users`);
    const usersData = await usersResp.json();
    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    const user = users.find(u => u._id === userId);
    if (!user) throw new Error('User not found');

    const updatedAddresses = (user.addresses || []).filter(
      a => String(a._id) !== String(addressId) && String(a.id) !== String(addressId)
    );
    const updateBody = { addresses: updatedAddresses };
    if (password) updateBody.currentPassword = password;

    const patchResp = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    });
    if (patchResp.status === 404) {
      const fbResp = await fetch(`${BASE_URL}/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      return handleResponse(fbResp);
    }
    return handleResponse(patchResp);
  },

  // Orders: the backend has no /orders/user/:id — filter from the full list by guestEmail
  getOrders: async (userId, userEmail) => {
    try {
      const response = await fetch(`${BASE_URL}/orders`, {
        headers: await authHeaders()
      });
      if (!response.ok) return [];
      const data = await response.json();
      const allOrders = Array.isArray(data) ? data : data.orders || [];

      if (!userEmail && !userId) return [];

      const email = userEmail?.toLowerCase();

      return allOrders.filter(o => {
        const oEmail = (o.guestEmail || o.email || '').toLowerCase();
        const oUserId = String(o.userId || o.user || '');
        return (email && oEmail === email) || (userId && oUserId === String(userId));
      });
    } catch (e) {
      console.warn('Orders fetch failed:', e);
      return [];
    }
  },

  updateOrderStatus: async (orderId, newStatus, additionalData = {}) => {
    if (!orderId) throw new Error('Order ID is required');
    const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ status: newStatus, ...additionalData }),
    });
    return handleResponse(response);
  },

  // verifyPayment: Verify the transaction AND save order details to admin
  verifyPayment: async (paymentData, orderDetails) => {
    const payload = {
      ...paymentData,
      orderDetails: orderDetails
    };

    const endpoints = [
      `${BASE_URL}/payment/verify-payment`,
      `${BASE_URL}/payments/verify-payment`
    ];

    let lastError;
    for (const url of endpoints) {
      try {
        console.log(`Verifying Payment & Syncing Order: POST ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          console.log(`Payment & Order Sync SUCCESS: ${url}`);
          return await handleResponse(response);
        }
        const errText = await response.text();
        console.log(`Sync Failed (${response.status}): ${url} - ${errText}`);
        lastError = new Error(`Verify Error ${response.status}: ${errText}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Payment verification and order sync failed');
  },

  // createOrder: Specifically save the order details to the admin database
  createOrder: async (orderData) => {
    if (!orderData) throw new Error('Order data is required');

    // Attempt multiple order creation endpoints
    const endpoints = [
      `${BASE_URL}/orders`,
      `${BASE_URL}/orders/create`,
      `${BASE_URL}/orders/place`,
      `${BASE_URL}/order`,
      `${BASE_URL}/payment/save-order`,
      `${BASE_URL}/payment/order`,
      `${BASE_URL}/payment/checkout`,
      `${BASE_URL}/users/orders`,
      `${BASE_URL}/users/${orderData.userId}/orders`,
      `${BASE_URL}/users/order`
    ];

    let lastError;
    for (const url of endpoints) {
      try {
        console.log(`Saving Order to Admin: POST ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(orderData),
        });

        if (response.ok) {
          console.log(`Order Saved SUCCESS: ${url}`);
          return await handleResponse(response);
        }
        const errText = await response.text();
        console.log(`Order Save Failed (${response.status}): ${url} - ${errText}`);
        lastError = new Error(`Backend Error ${response.status}: ${errText}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Failed to save order to admin database');
  },
  // submitReturnRequest: Send return/replace request to admin backend
  submitReturnRequest: async (requestData) => {
    if (!requestData) throw new Error('Request data is required');

    const endpoints = [
      `${BASE_URL}/orders/${encodeURIComponent(requestData.orderId)}/return`,
      `${BASE_URL}/orders/return`,
      `${BASE_URL}/orders/return-request`,
      `${BASE_URL}/returns`,
    ];

    let lastError;
    for (const url of endpoints) {
      try {
        console.log(`Submitting Return/Replace Request: POST ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(requestData),
        });
        if (response.ok) {
          console.log(`Return/Replace Request SUCCESS: ${url}`);
          return await handleResponse(response);
        }
        const errText = await response.text();
        console.log(`Return/Replace Failed (${response.status}): ${url} - ${errText}`);
        lastError = new Error(`Backend Error ${response.status}: ${errText}`);
      } catch (e) {
        lastError = e;
      }
    }
    // Don't throw — fall back gracefully if backend doesn't have this endpoint yet
    console.warn('Return request could not reach backend:', lastError?.message);
    return null;
  },
};
