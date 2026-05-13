const BASE_URL = 'https://cromsen-backend.onrender.com/api';

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
  // If it's an object, try to extract various possible URL properties
  if (imagePath && typeof imagePath === 'object' && !Array.isArray(imagePath)) {
    imagePath = imagePath.url || imagePath.imageURL || imagePath.path || 
                imagePath.secure_url || imagePath.uri || imagePath.src || 
                imagePath.original || imagePath.link || "";
  }

  // If it's an array, take the first valid element
  if (Array.isArray(imagePath)) {
    const firstValid = imagePath.find(item => item && (typeof item === 'string' || typeof item === 'object'));
    if (firstValid) return getImageUrl(firstValid); // Recurse
    imagePath = "";
  }

  if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === "") {
    return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400';
  }

  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('data:image')) return imagePath;
  
  // Normalize slashes for cross-platform compatibility
  const normalizedPath = imagePath.replace(/\\/g, '/');
  
  // If the path already includes the domain but not the protocol
  if (normalizedPath.includes('cromsen-backend.onrender.com') && !normalizedPath.startsWith('http')) {
    return `https://${normalizedPath.replace(/^\/+/, '')}`;
  }

  const baseUrl = BASE_URL.replace('/api', '');
  
  // Ensure we don't double up slashes
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${baseUrl}${cleanPath}`;
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
  getProfile: async (userId) => {
    const response = await fetch(`${BASE_URL}/users/${userId}/profile`);
    return handleResponse(response);
  },
};

export const productService = {
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/products?${query}`);
    return handleResponse(response);
  },
  getProductById: async (id) => {
    const response = await fetch(`${BASE_URL}/products/${id}`);
    return handleResponse(response);
  },
  searchProducts: async (query) => {
    const response = await fetch(`${BASE_URL}/products/search?q=${query}`);
    return handleResponse(response);
  },
  addReview: async (productId, reviewData) => {
    // Try multiple endpoint patterns for reviews
    const endpoints = [
      { url: `${BASE_URL}/products/${productId}/reviews`, method: 'POST' },
      { url: `${BASE_URL}/reviews`, method: 'POST', body: { ...reviewData, productId } },
      { url: `${BASE_URL}/product-reviews`, method: 'POST', body: { ...reviewData, productId } },
      { url: `${BASE_URL}/products/reviews/${productId}`, method: 'POST' },
      { url: `${BASE_URL}/products/${productId}`, method: 'PUT', body: { ...reviewData } },
      { url: `${BASE_URL}/products/${productId}`, method: 'PATCH', body: { reviews: [reviewData] } }
    ];

    let lastError;
    for (const ep of endpoints) {
      try {
        console.log(`Trying Review Sync: ${ep.method} ${ep.url}`);
        const response = await fetch(ep.url, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ep.body || reviewData),
        });
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
  getReviews: async (productId) => {
    const endpoints = [
      `${BASE_URL}/products/${productId}/reviews`,
      `${BASE_URL}/reviews?product=${productId}`,
      `${BASE_URL}/reviews?productId=${productId}`,
      `${BASE_URL}/reviews/${productId}`
    ];
    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (response.ok) return await handleResponse(response);
      } catch (e) {}
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
  // Addresses: stored inside the user doc — fetch all users, find by ID, PATCH to update
  updateProfile: async (userId, userData) => {
    // Based on userroute.js: router.put('/:id/profile', userController.updateUserProfile);
    const url = `${BASE_URL}/users/${userId}/profile`;
    
    try {
      console.log(`[SYNC] Updating Profile: PUT ${url}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log(`[SYNC] Profile Update SUCCESS`);
        return await handleResponse(response);
      }

      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.message || '';

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
      // router.get('/:id/profile', userController.getUserProfile);
      const response = await fetch(`${BASE_URL}/users/${userId}/profile`);
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
      const getResp = await fetch(`${BASE_URL}/users/${userId}/profile`);
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

      const updatedAddresses = [...(user.addresses || []), backendAddr];
      
      // 2. Push updated addresses to backend
      const updateUrl = `${BASE_URL}/users/${userId}/profile`;
      console.log(`[SYNC] Syncing Addresses: PUT ${updateUrl}`);
      const updateBody = { addresses: updatedAddresses };
      if (password) updateBody.currentPassword = password;
      
      const updateResp = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });

      if (updateResp.ok) {
        console.log(`[SYNC] Address Sync SUCCESS`);
        return await handleResponse(updateResp);
      }

      const errData = await updateResp.json().catch(() => ({}));
      const errMsg = errData.message || '';
      if (updateResp.status === 400 && (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('required'))) {
        console.warn('[SYNC] Backend requires password for profile address update. Skipping backend sync, using local state.');
        return { success: true, localOnly: true };
      }

      // If all else fails, handle error normally
      return await handleResponse(updateResp);
    } catch (e) {
      console.error('Add address error:', e);
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
      const fbResp = await fetch(`${BASE_URL}/users/profile/${userId}`, {
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
      const response = await fetch(`${BASE_URL}/orders`);
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

  updateOrderStatus: async (orderId, newStatus) => {
    if (!orderId) throw new Error('Order ID is required');
    const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
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
          headers: { 'Content-Type': 'application/json' },
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
      `${BASE_URL}/payment/cod-order`,
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
          headers: { 'Content-Type': 'application/json' },
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
};
