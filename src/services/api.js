const BASE_URL = 'https://cromsen-backend.onrender.com/api';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

export const getImageUrl = (imagePath) => {
  // If it's an object, try to extract a URL property
  if (imagePath && typeof imagePath === 'object' && !Array.isArray(imagePath)) {
    imagePath = imagePath.url || imagePath.path || imagePath.secure_url || imagePath.uri || "";
  }

  // If it's an array, take the first element
  if (Array.isArray(imagePath) && imagePath.length > 0) {
    imagePath = imagePath[0];
    return getImageUrl(imagePath); // Recurse to handle if the first element is also an object
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
  getAddresses: async (userId) => {
    const response = await fetch(`${BASE_URL}/users/${userId}/addresses`);
    return handleResponse(response);
  },
  addAddress: async (userId, addressData) => {
    const response = await fetch(`${BASE_URL}/users/${userId}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData),
    });
    return handleResponse(response);
  },
  deleteAddress: async (userId, addressId) => {
    const response = await fetch(`${BASE_URL}/users/${userId}/addresses/${addressId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
  getOrders: async (userId) => {
    const response = await fetch(`${BASE_URL}/orders/user/${userId}`);
    return handleResponse(response);
  },
  createOrder: async (orderData) => {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return handleResponse(response);
  },
};
