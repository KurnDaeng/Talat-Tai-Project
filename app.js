const PRODUCTS_STORAGE_KEY = "talat-tai-products";
const ORDERS_STORAGE_KEY = "talat-tai-orders";
const SETTINGS_STORAGE_KEY = "talat-tai-settings";
const CUSTOMER_STORAGE_KEY = "talat-tai-customer";
const BRAND_STORAGE_KEY = "talat-tai-brand";
const CLOUD = window.TALAT_TAI_CLOUD || { enabled: false };

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

const defaultSettings = window.TALAT_TAI_DEFAULT_SETTINGS || {
  currency: "THB",
  freeShippingAt: 1500,
  shippingFee: 60,
  paymentMode: "demo",
  createChargeEndpoint: "/api/payments/thai-qr",
};
const savedSettings = readJson(SETTINGS_STORAGE_KEY, {});
const STORE_CONFIG = {
  ...defaultSettings,
  ...savedSettings,
  paymentQr: {
    ...(defaultSettings.paymentQr || {}),
    ...(savedSettings.paymentQr || {}),
  },
};
let products = readJson(
  PRODUCTS_STORAGE_KEY,
  cloneData(window.TALAT_TAI_DEFAULT_PRODUCTS || []),
);
let currentCustomer = readJson(CUSTOMER_STORAGE_KEY, null);
let lastCustomerDetails = {};

const translations = window.TALAT_TAI_TRANSLATIONS;

const supportedLanguages = ["en", "th", "mm"];
const savedLanguage = localStorage.getItem("talat-tai-language");
let language = supportedLanguages.includes(savedLanguage) ? savedLanguage : "en";
let activeFilter = "all";
let cart = JSON.parse(localStorage.getItem("talat-tai-cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("talat-tai-wishlist") || "[]");
let toastTimer;
let uploadedReceipt = null;
let selectedPaymentMethod = "thai";

const elements = {
  customerLoginScreen: document.querySelector("#customerLoginScreen"),
  customerLoginForm: document.querySelector("#customerLoginForm"),
  customerLoginButton: document.querySelector("#customerLoginButton"),
  customerLoginStatus: document.querySelector("#customerLoginStatus"),
  customerAccount: document.querySelector("#customerAccount"),
  customerAccountEmail: document.querySelector("#customerAccountEmail"),
  customerLogoutButton: document.querySelector("#customerLogoutButton"),
  productGrid: document.querySelector("#productGrid"),
  cartButton: document.querySelector("#cartButton"),
  cartDrawer: document.querySelector("#cartDrawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  closeCart: document.querySelector("#closeCart"),
  cartCount: document.querySelector("#cartCount"),
  cartItems: document.querySelector("#cartItems"),
  emptyCart: document.querySelector("#emptyCart"),
  cartSummary: document.querySelector("#cartSummary"),
  cartSubtotal: document.querySelector("#cartSubtotal"),
  continueShopping: document.querySelector("#continueShopping"),
  checkoutButton: document.querySelector("#checkoutButton"),
  checkoutBackdrop: document.querySelector("#checkoutBackdrop"),
  checkoutModal: document.querySelector("#checkoutModal"),
  closeCheckout: document.querySelector("#closeCheckout"),
  customerForm: document.querySelector("#customerForm"),
  checkoutItems: document.querySelector("#checkoutItems"),
  checkoutSubtotal: document.querySelector("#checkoutSubtotal"),
  checkoutShipping: document.querySelector("#checkoutShipping"),
  checkoutTotal: document.querySelector("#checkoutTotal"),
  qrTotal: document.querySelector("#qrTotal"),
  qrCode: document.querySelector("#qrCode"),
  paymentQrImage: document.querySelector("#paymentQrImage"),
  paymentQrPlaceholder: document.querySelector("#paymentQrPlaceholder"),
  paymentMethodLabel: document.querySelector("#paymentMethodLabel"),
  paymentMethods: document.querySelector("#paymentMethods"),
  receiptInput: document.querySelector("#receiptUpload"),
  receiptPreview: document.querySelector("#receiptPreview"),
  receiptPreviewImage: document.querySelector("#receiptPreviewImage"),
  receiptFileName: document.querySelector("#receiptFileName"),
  receiptStatus: document.querySelector("#receiptStatus"),
  submitReceipt: document.querySelector("#submitReceipt"),
  backToDetails: document.querySelector("#backToDetails"),
  finishOrder: document.querySelector("#finishOrder"),
  orderNumber: document.querySelector("#orderNumber"),
  languageSelect: document.querySelector("#languageSelect"),
  toast: document.querySelector("#toast"),
};

function paymentMethodName(method) {
  const labels = {
    thai: "Thai QR",
    myanmar: "Myanmar QR",
    crypto: "Crypto Payment",
  };
  return STORE_CONFIG.paymentQr?.[method]?.label || labels[method] || "Bank Transfer";
}

function renderPaymentQr() {
  const paymentQr = STORE_CONFIG.paymentQr?.[selectedPaymentMethod] || {};
  const hasUploadedQr = Boolean(paymentQr.dataUrl);
  elements.paymentMethodLabel.textContent = paymentMethodName(selectedPaymentMethod);
  elements.paymentQrImage.hidden = !hasUploadedQr;
  elements.paymentQrPlaceholder.hidden = hasUploadedQr;
  elements.qrCode.classList.toggle("has-upload", hasUploadedQr);
  if (hasUploadedQr) {
    elements.paymentQrImage.src = paymentQr.dataUrl;
  } else {
    elements.paymentQrImage.removeAttribute("src");
  }
  elements.paymentMethods.querySelectorAll("[data-payment-method]").forEach((button) => {
    button.classList.toggle("active", button.dataset.paymentMethod === selectedPaymentMethod);
  });
}

function prefillCustomerForm() {
  if (!currentCustomer) return;
  const fields = elements.customerForm.elements;
  fields.name.value = currentCustomer.name || fields.name.value;
  if (fields.phone) fields.phone.value = currentCustomer.phone || fields.phone.value;
  if (fields.email && currentCustomer.email) fields.email.value = currentCustomer.email;
}

function showCustomerStore() {
  const isSignedIn = Boolean(currentCustomer?.name);
  elements.customerLoginScreen.hidden = isSignedIn;
  elements.customerAccount.hidden = !isSignedIn;
  elements.customerAccountEmail.textContent = currentCustomer?.name || "";
  document.body.classList.toggle("signed-out", !isSignedIn);
  if (isSignedIn) prefillCustomerForm();
}

function money(value) {
  const locales = { en: "en-US", th: "th-TH", mm: "my-MM" };
  return `฿${new Intl.NumberFormat(locales[language], {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function text(key) {
  return translations[language][key] || key;
}

function productById(id) {
  return products.find((product) => product.id === id);
}

function localized(value) {
  return value?.[language] || value?.en || "";
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

function syncCartWithProducts() {
  const originalLength = cart.length;
  cart = cart.filter((item) => productById(item.id));
  if (cart.length !== originalLength) {
    saveCart();
  }
}

function cartSubtotal() {
  return cart.reduce((total, item) => {
    const product = productById(item.id);
    return product ? total + product.price * item.quantity : total;
  }, 0);
}

function shippingCost() {
  const subtotal = cartSubtotal();
  if (subtotal === 0) return 0;
  return subtotal >= STORE_CONFIG.freeShippingAt ? 0 : STORE_CONFIG.shippingFee;
}

function cartTotal() {
  return cartSubtotal() + shippingCost();
}

function saveCart() {
  localStorage.setItem("talat-tai-cart", JSON.stringify(cart));
}

function saveWishlist() {
  localStorage.setItem("talat-tai-wishlist", JSON.stringify(wishlist));
}

function updateWishlistCount() {
  const button = document.querySelector('.filter-favorites');
  if (button) button.dataset.count = wishlist.length;
}

function toggleWishlist(id) {
  const product = productById(id);
  if (!product) return;
  const index = wishlist.indexOf(id);
  if (index === -1) {
    wishlist.push(id);
    showToast(`${localized(product.name)} ${text("wishlistAdded")}`);
  } else {
    wishlist.splice(index, 1);
    showToast(`${localized(product.name)} ${text("wishlistRemoved")}`);
  }
  saveWishlist();
  renderProducts();
}

function renderProducts() {
  const visibleProducts = products.filter((product) => {
    if (product.active === false) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "favorites") return wishlist.includes(product.id);
    const categories = Array.isArray(product.category) ? product.category : [product.category];
    return categories.includes(activeFilter);
  });

  updateWishlistCount();

  if (activeFilter === "favorites" && visibleProducts.length === 0) {
    elements.productGrid.innerHTML = `<p class="empty-favorites">${text("wishlistEmpty")}</p>`;
    return;
  }

  elements.productGrid.innerHTML = visibleProducts
    .map(
      (product, index) => {
        const isSoldOut = Number(product.stock) <= 0;
        const faved = wishlist.includes(product.id);
        return `
        <article class="product-card" style="animation-delay:${index * 60}ms">
          <div class="product-image${product.image?.dataUrl ? " has-photo" : ""}" style="--image-bg:${product.background};--object-color:${product.color}">
            <span class="product-badge">${isSoldOut ? text("soldOut") : localized(product.badge)}</span>
            <button class="wishlist-toggle${faved ? " active" : ""}" data-wishlist="${product.id}" type="button"
              aria-pressed="${faved}" aria-label="Save ${localized(product.name)} to favorites">${faved ? "♥" : "♡"}</button>
            ${product.image?.dataUrl
              ? `<img class="product-photo" src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<div class="product-object object-${product.shape}" aria-hidden="true"></div>`}
            <button class="quick-add" data-add-product="${product.id}" type="button"
              aria-label="Add ${localized(product.name)} to cart" ${isSoldOut ? "disabled" : ""}>+</button>
          </div>
          <div class="product-details">
            <div>
              <h3>${localized(product.name)}</h3>
              <p>${localized(product.maker)}</p>
            </div>
            <strong>${money(product.price)}</strong>
          </div>
        </article>
      `;
      },
    )
    .join("");
}

function renderCart() {
  syncCartWithProducts();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  elements.cartCount.textContent = itemCount;
  elements.emptyCart.hidden = cart.length > 0;
  elements.cartItems.hidden = cart.length === 0;
  elements.cartSummary.hidden = cart.length === 0;
  elements.cartSubtotal.textContent = money(cartSubtotal());

  elements.cartItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      return `
        <article class="cart-item">
          <div class="cart-thumb" style="--thumb-bg:${product.background};--thumb-color:${product.color}">
            ${product.image?.dataUrl
              ? `<img src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<span></span>`}
          </div>
          <div>
            <h3>${localized(product.name)}</h3>
            <p>${money(product.price)}</p>
            <div class="quantity-control" aria-label="Quantity">
              <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Decrease">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Increase">+</button>
            </div>
          </div>
          <button class="remove-item" type="button" data-remove="${product.id}" aria-label="Remove">×</button>
        </article>
      `;
    })
    .join("");

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  elements.checkoutItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return "";
      return `
        <div class="checkout-summary-item">
          <div class="summary-thumb" style="--thumb-bg:${product.background};--thumb-color:${product.color}">
            ${product.image?.dataUrl
              ? `<img src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<span></span>`}
            <span class="summary-quantity">${item.quantity}</span>
          </div>
          <div>
            <p>${localized(product.name)}</p>
            <small>${localized(product.maker)}</small>
          </div>
          <strong>${money(product.price * item.quantity)}</strong>
        </div>
      `;
    })
    .join("");

  elements.checkoutSubtotal.textContent = money(cartSubtotal());
  const freeShipping = language === "th" ? "ฟรี" : language === "mm" ? "အခမဲ့" : "Free";
  elements.checkoutShipping.textContent =
    shippingCost() === 0 && cart.length > 0 ? freeShipping : money(shippingCost());
  elements.checkoutTotal.textContent = money(cartTotal());
  elements.qrTotal.textContent = money(cartTotal());
}

function addToCart(id) {
  const product = productById(id);
  if (!product) return;
  if (Number(product.stock) <= 0) {
    showToast(`${localized(product.name)} ${text("soldOut")}`);
    return;
  }
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  showToast(`${localized(product.name)} ${text("addedToCart")}`);
}

function changeQuantity(id, change) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function openCart() {
  elements.cartDrawer.classList.add("open");
  elements.drawerBackdrop.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCart() {
  elements.cartDrawer.classList.remove("open");
  elements.drawerBackdrop.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function openCheckout() {
  closeCart();
  prefillCustomerForm();
  renderPaymentQr();
  showCheckoutStep(1);
  renderCheckoutSummary();
  elements.checkoutModal.classList.add("open");
  elements.checkoutBackdrop.classList.add("open");
  elements.checkoutModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCheckout() {
  elements.checkoutModal.classList.remove("open");
  elements.checkoutBackdrop.classList.remove("open");
  elements.checkoutModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function showCheckoutStep(step) {
  document.querySelectorAll("[data-checkout-step]").forEach((element) => {
    element.classList.toggle("active", Number(element.dataset.checkoutStep) === step);
  });
  document.querySelectorAll(".progress-step").forEach((element) => {
    element.classList.toggle("active", Number(element.dataset.step) <= step);
  });
  document.querySelector(".checkout-main").scrollTop = 0;
}

function resetReceiptUpload() {
  uploadedReceipt = null;
  elements.receiptInput.value = "";
  elements.receiptPreview.hidden = true;
  elements.receiptPreviewImage.removeAttribute("src");
  elements.receiptFileName.textContent = "";
  elements.receiptStatus.textContent = text("receiptEmpty");
  elements.submitReceipt.disabled = true;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function compressReceiptImage(dataUrl, fileName, originalSize) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxSize = 1100;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.78);
      resolve({
        dataUrl: compressedDataUrl,
        name: fileName,
        type: "image/jpeg",
        originalSize,
        storedSize: compressedDataUrl.length,
        uploadedAt: new Date().toISOString(),
      });
    });
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

async function handleReceiptUpload(file) {
  if (!file) {
    resetReceiptUpload();
    return;
  }

  if (!file.type.startsWith("image/")) {
    resetReceiptUpload();
    showToast(text("receiptInvalid"));
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    resetReceiptUpload();
    showToast(text("receiptTooLarge"));
    return;
  }

  try {
    elements.receiptStatus.textContent = text("receiptPreparing");
    const dataUrl = await readFileAsDataUrl(file);
    uploadedReceipt = await compressReceiptImage(dataUrl, file.name, file.size);
    if (uploadedReceipt.storedSize > 2.5 * 1024 * 1024) {
      resetReceiptUpload();
      showToast(text("receiptTooLarge"));
      return;
    }
    elements.receiptPreviewImage.src = uploadedReceipt.dataUrl;
    elements.receiptFileName.textContent = uploadedReceipt.name;
    elements.receiptPreview.hidden = false;
    elements.receiptStatus.textContent = text("receiptReady");
    elements.submitReceipt.disabled = false;
  } catch {
    resetReceiptUpload();
    showToast(text("receiptInvalid"));
  }
}

async function createPayment() {
  lastCustomerDetails = {
    ...(currentCustomer || {}),
    ...Object.fromEntries(new FormData(elements.customerForm)),
  };
  if (STORE_CONFIG.paymentMode === "demo") {
    showCheckoutStep(2);
    return;
  }

  const response = await fetch(STORE_CONFIG.createChargeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: lastCustomerDetails,
      items: cart,
      expectedAmount: cartTotal(),
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to create payment");
  }

  const payment = await response.json();
  // In production, render payment.qrImage or payment.qrPayload here and poll only
  // a server-owned order status. Never trust a browser-only "paid" button.
  console.info("Payment created", payment.id);
  showCheckoutStep(2);
}

async function completeDemoOrder() {
  if (!uploadedReceipt) {
    showToast(text("receiptRequired"));
    return;
  }
  const timestamp = Date.now().toString().slice(-6);
  const reference = `TT-${timestamp}`;
  elements.orderNumber.textContent = reference;
  try {
    await saveOrder(reference, uploadedReceipt);
  } catch (error) {
    showToast(error.message || text("receiptStorageError"));
    return;
  }
  showCheckoutStep(3);
}

async function saveOrder(reference, receipt) {
  const orderItems = cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return null;
      return {
        id: product.id,
        name: cloneData(product.name),
        maker: cloneData(product.maker),
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      };
    })
    .filter(Boolean);

  // Only use the cloud order flow when a real Supabase session exists. With the
  // simple name+phone sign-in there is no session, so orders are saved locally.
  let cloudSession = null;
  if (CLOUD.enabled) {
    try {
      cloudSession = await CLOUD.getSession();
    } catch {
      cloudSession = null;
    }
  }

  if (CLOUD.enabled && cloudSession) {
    await CLOUD.createOrder({
      reference,
      receipt,
      customer: lastCustomerDetails,
      paymentMethodKey: selectedPaymentMethod,
      language,
      items: orderItems,
    });
    // Keep a lightweight local copy so the customer's "My Orders" tab shows it.
    const localOrders = readJson(ORDERS_STORAGE_KEY, []);
    localOrders.unshift({
      reference,
      createdAt: new Date().toISOString(),
      status: "receipt_submitted",
      paymentStatus: "pending_review",
      paymentMethod: paymentMethodName(selectedPaymentMethod),
      paymentMethodKey: selectedPaymentMethod,
      customer: lastCustomerDetails,
      items: orderItems,
      subtotal: cartSubtotal(),
      shipping: shippingCost(),
      total: cartTotal(),
      currency: STORE_CONFIG.currency,
      language,
    });
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(localOrders));
    products = await CLOUD.getProducts();
    renderProducts();
    return;
  }

  const orders = readJson(ORDERS_STORAGE_KEY, []);

  orders.unshift({
    reference,
    createdAt: new Date().toISOString(),
    status: "receipt_submitted",
    paymentStatus: "pending_review",
    fulfillmentStatus: "payment_review",
    paymentMethod: paymentMethodName(selectedPaymentMethod),
    paymentMethodKey: selectedPaymentMethod,
    receipt,
    customer: lastCustomerDetails,
    items: orderItems,
    subtotal: cartSubtotal(),
    shipping: shippingCost(),
    total: cartTotal(),
    currency: STORE_CONFIG.currency,
    language,
    stockAdjusted: true,
  });

  products = products.map((product) => {
    const orderItem = cart.find((item) => item.id === product.id);
    if (!orderItem || typeof product.stock !== "number") return product;
    return { ...product, stock: Math.max(0, product.stock - orderItem.quantity) };
  });

  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  saveProducts();
}

function resetOrder() {
  cart = [];
  saveCart();
  renderProducts();
  renderCart();
  elements.customerForm.reset();
  prefillCustomerForm();
  resetReceiptUpload();
  closeCheckout();
  showPage("orders");
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations[language][key]) {
      element.innerHTML = translations[language][key];
    }
  });
  elements.languageSelect.value = language;
  localStorage.setItem("talat-tai-language", language);
  renderProducts();
  renderCart();
  renderActivePage();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

elements.customerLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const details = Object.fromEntries(new FormData(event.currentTarget));
  // Simple local sign-in: just a name and phone number, saved on this device.
  currentCustomer = {
    name: details.name.trim(),
    phone: (details.phone || "").trim(),
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(currentCustomer));
  showCustomerStore();
  showPage("home");
});

elements.customerLogoutButton.addEventListener("click", async () => {
  if (CLOUD.enabled) {
    try {
      await CLOUD.signOut();
    } catch {
      /* ignore: simple sign-in has no cloud session */
    }
  }
  currentCustomer = null;
  lastCustomerDetails = {};
  localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  elements.customerLoginForm.reset();
  showCustomerStore();
});

elements.paymentMethods.addEventListener("click", (event) => {
  const button = event.target.closest("[data-payment-method]");
  if (!button) return;
  selectedPaymentMethod = button.dataset.paymentMethod;
  renderPaymentQr();
});

document.querySelector("#filterRow").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((filter) => filter.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
});

elements.productGrid.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-product]");
  if (addButton) {
    addToCart(addButton.dataset.addProduct);
    return;
  }
  const wishButton = event.target.closest("[data-wishlist]");
  if (wishButton) toggleWishlist(wishButton.dataset.wishlist);
});

elements.cartItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) {
    changeQuantity(quantityButton.dataset.quantity, Number(quantityButton.dataset.change));
  }
  if (removeButton) {
    removeFromCart(removeButton.dataset.remove);
  }
});

elements.cartButton.addEventListener("click", openCart);
elements.closeCart.addEventListener("click", closeCart);
elements.drawerBackdrop.addEventListener("click", closeCart);
elements.continueShopping.addEventListener("click", closeCart);
elements.checkoutButton.addEventListener("click", openCheckout);
elements.closeCheckout.addEventListener("click", closeCheckout);
elements.checkoutBackdrop.addEventListener("click", closeCheckout);
elements.backToDetails.addEventListener("click", () => showCheckoutStep(1));
elements.receiptInput.addEventListener("change", (event) => {
  handleReceiptUpload(event.target.files[0]);
});
elements.submitReceipt.addEventListener("click", completeDemoOrder);
elements.finishOrder.addEventListener("click", resetOrder);
elements.languageSelect.addEventListener("change", (event) => {
  language = event.target.value;
  applyLanguage();
});

// ===== App tab navigation (Home / Orders / Cash / Profile) =====
let activePage = "home";

function renderActivePage() {
  if (activePage === "orders") renderOrders();
  else if (activePage === "cash") renderCash();
  else if (activePage === "profile") renderProfile();
}

function showPage(page) {
  activePage = page;
  document.querySelectorAll(".app-page").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });
  document.querySelectorAll(".bottom-nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  renderActivePage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function orderStatusInfo(order) {
  const status = order.paymentStatus || order.status;
  if (status === "approved" || status === "paid") {
    return { cls: "approved", label: text("orderStatusApproved") };
  }
  if (status === "rejected" || status === "declined") {
    return { cls: "rejected", label: text("orderStatusRejected") };
  }
  return { cls: "review", label: text("orderStatusReview") };
}

function customerOrders() {
  const all = readJson(ORDERS_STORAGE_KEY, []);
  const phone = currentCustomer?.phone;
  if (!phone) return all;
  const mine = all.filter((order) => (order.customer?.phone || "") === phone);
  return mine.length ? mine : all;
}

function renderOrders() {
  const list = document.querySelector("#ordersList");
  if (!list) return;
  const orders = customerOrders();
  if (!orders.length) {
    list.innerHTML =
      `<div class="orders-empty"><strong>${text("ordersEmpty")}</strong>` +
      `<span>${text("ordersEmptyHint")}</span></div>`;
    return;
  }
  list.innerHTML = orders
    .map((order) => {
      const info = orderStatusInfo(order);
      const count = (order.items || []).reduce((n, item) => n + (item.quantity || 0), 0);
      const date = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";
      return `
        <article class="order-card">
          <div class="order-card-top">
            <strong>${order.reference}</strong>
            <span class="order-status ${info.cls}">${info.label}</span>
          </div>
          <div class="order-date">${date} · ${count} ${text("orderItemsLabel")}</div>
          <div class="order-card-foot">
            <span>${order.paymentMethod || ""}</span>
            <strong>${money(order.total || 0)}</strong>
          </div>
        </article>`;
    })
    .join("");
}

function renderCash() {
  const wrap = document.querySelector("#cashMethods");
  if (!wrap) return;
  wrap.innerHTML = ["thai", "myanmar", "crypto"]
    .map((key) => {
      const method = STORE_CONFIG.paymentQr?.[key] || {};
      const label = paymentMethodName(key);
      const qr = method.dataUrl
        ? `<img src="${method.dataUrl}" alt="${label} QR" />`
        : `<span class="demo-tag">DEMO</span>`;
      return `
        <div class="cash-method">
          <div class="cash-method-qr">${qr}</div>
          <strong>${label}</strong>
        </div>`;
    })
    .join("");
}

function renderProfile() {
  const nameEl = document.querySelector("#profileName");
  const emailEl = document.querySelector("#profileEmail");
  const logoutBtn = document.querySelector("#profileLogout");
  const langSel = document.querySelector("#profileLanguage");
  if (!nameEl) return;
  if (currentCustomer?.name) {
    nameEl.textContent = currentCustomer.name;
    emailEl.textContent = currentCustomer.phone || currentCustomer.email || "";
    if (logoutBtn) logoutBtn.hidden = false;
  } else {
    nameEl.textContent = text("profileGuest");
    emailEl.textContent = "";
    if (logoutBtn) logoutBtn.hidden = true;
  }
  if (langSel) langSel.value = language;
}

document.querySelector("#bottomNav").addEventListener("click", (event) => {
  const button = event.target.closest(".bottom-nav-item");
  if (button) showPage(button.dataset.page);
});

document.querySelector("#profileLanguage").addEventListener("change", (event) => {
  language = event.target.value;
  applyLanguage();
});

document.querySelector("#profileLogout").addEventListener("click", () => {
  elements.customerLogoutButton.click();
});

elements.customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.customerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await createPayment();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.checkoutModal.classList.contains("open")) {
    closeCheckout();
  } else {
    closeCart();
  }
});

async function initializeStorefront() {
  if (CLOUD.enabled) {
    try {
      const [cloudProducts, cloudSettings, session] = await Promise.all([
        CLOUD.getProducts(),
        CLOUD.getSettings(),
        CLOUD.getSession(),
      ]);
      products = cloudProducts;
      Object.assign(STORE_CONFIG, cloudSettings);
      // Prefer a real cloud session; otherwise keep the simple local sign-in.
      currentCustomer = session
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || "",
          }
        : readJson(CUSTOMER_STORAGE_KEY, null);
    } catch (error) {
      currentCustomer = readJson(CUSTOMER_STORAGE_KEY, null);
      showToast(`Cloud connection: ${error.message}`);
    }
  }

  applyBrand();
  document.querySelector("#year").textContent = new Date().getFullYear();
  applyLanguage();
  renderPaymentQr();
  showCustomerStore();
}

function applyBrand() {
  let brand = {};
  try {
    brand = JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY)) || {};
  } catch {
    brand = {};
  }

  // Apply CSS color variables
  const colors = brand.colors || {};
  const colorMap = {
    green: "--green",
    gold: "--gold",
    paper: "--paper",
    ink: "--ink",
    terracotta: "--terracotta",
  };
  Object.entries(colorMap).forEach(([key, cssVar]) => {
    if (colors[key]) {
      document.documentElement.style.setProperty(cssVar, colors[key]);
    }
  });

  // Apply logo to all brand logo images
  if (brand.logoDataUrl) {
    document.querySelectorAll(".brand-logo, .empty-logo").forEach((img) => {
      img.src = brand.logoDataUrl;
    });
  }

  // Apply store name to all brand name spans
  if (brand.storeName) {
    document.querySelectorAll(".brand span, .brand-light span").forEach((el) => {
      el.textContent = brand.storeName;
    });
    document.title = brand.storeName + " | Thoughtful goods from Thailand";
    const copyrightEl = document.querySelector(".copyright");
    if (copyrightEl) {
      copyrightEl.innerHTML = `© <span id="year"></span> ${brand.storeName}`;
    }
  }

  // Apply contact email
  if (brand.contactEmail) {
    document.querySelectorAll("a[href^='mailto:']").forEach((a) => {
      a.href = `mailto:${brand.contactEmail}`;
    });
  }

  // Merge brand texts into translations (overrides defaults)
  if (brand.texts) {
    Object.keys(translations).forEach((lang) => {
      if (brand.texts[lang]) {
        Object.assign(translations[lang], brand.texts[lang]);
      }
    });
  }
}

initializeStorefront();
