// Cart state manager with localStorage persistence and event subscriptions

const STORAGE_KEY = 'eko_cart_v1';

function getStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

let cartItems = getStoredCart();
const listeners = new Set();

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
  notify();
}

function notify() {
  listeners.forEach(fn => {
    try {
      fn(cartItems);
    } catch (e) {
      console.error(e);
    }
  });
}

export const cartStore = {
  getItems() {
    return [...cartItems];
  },
  getCount() {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  },
  getTotal() {
    return cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  },
  addItem(item) {
    // Check if already in cart
    const existingIndex = cartItems.findIndex(i => i.id === item.id && i.license === item.license);
    if (existingIndex > -1) {
      cartItems[existingIndex].quantity = (cartItems[existingIndex].quantity || 1) + 1;
    } else {
      cartItems.push({
        ...item,
        quantity: 1,
        addedAt: Date.now()
      });
    }
    saveCart();
  },
  removeItem(id, license) {
    cartItems = cartItems.filter(i => !(i.id === id && (!license || i.license === license)));
    saveCart();
  },
  updateQuantity(id, license, qty) {
    const item = cartItems.find(i => i.id === id && (!license || i.license === license));
    if (item) {
      if (qty <= 0) {
        cartStore.removeItem(id, license);
      } else {
        item.quantity = qty;
        saveCart();
      }
    }
  },
  clear() {
    cartItems = [];
    saveCart();
  },
  subscribe(fn) {
    listeners.add(fn);
    fn(cartItems);
    return () => listeners.delete(fn);
  }
};
