// public/js/state.js - Global in-memory state management

const State = {
  // Current active cart items
  cart: [],

  // Currently logged-in user (from Supabase Auth)
  currentUser: {
    id: null,
    name: 'Alex Manager',
    role: 'manager',
    terminal: 'Terminal 01',
    initials: 'AM'
  },

  // Last completed transaction (for receipt page)
  currentTxn: null,

  // App settings
  settings: {
    taxRate: 0.085,
    storeName: 'GadgetStock',
    terminal: 'Terminal 01',
    lowStockThreshold: 10
  },

  // Listeners for state changes
  _listeners: {},

  // ─── Cart Methods ─────────────────────────────────────────

  addToCart(product, qty = 1) {
    const existing = this.cart.find(i => i.product_id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      this.cart.push({
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price_sell,
        image_url: product.image_url,
        category: product.category,
        stock: product.stock,
        qty: qty
      });
    }
    this._emit('cart');
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.product_id !== productId);
    this._emit('cart');
  },

  updateQty(productId, qty) {
    const item = this.cart.find(i => i.product_id === productId);
    if (item) {
      if (qty <= 0) {
        this.removeFromCart(productId);
      } else {
        item.qty = Math.min(qty, item.stock);
        this._emit('cart');
      }
    }
  },

  clearCart() {
    this.cart = [];
    this._emit('cart');
  },

  getCartTotals() {
    const subtotal = this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const tax = Math.round(subtotal * this.settings.taxRate);
    const total = subtotal + tax;
    return { subtotal, tax, total, itemCount: this.cart.length };
  },

  // ─── Transaction Methods ───────────────────────────────────

  setCurrentTxn(txn) {
    this.currentTxn = txn;
    this._emit('txn');
  },

  // ─── User Methods ──────────────────────────────────────────

  setUser(user) {
    this.currentUser = {
      id: user.id,
      name: user.user_metadata?.full_name || user.email,
      role: user.user_metadata?.role || 'cashier',
      terminal: user.user_metadata?.terminal || 'Terminal 01',
      initials: (user.user_metadata?.full_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    };
    this._emit('user');
  },

  // ─── Event Emitter ─────────────────────────────────────────

  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  },

  off(event, cb) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(l => l !== cb);
    }
  },

  _emit(event) {
    (this._listeners[event] || []).forEach(cb => cb(this));
  }
};

export default State;
