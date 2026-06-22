const PRODUCT_KEY = "talat-tai-products";
const ORDER_KEY = "talat-tai-orders";
const SETTINGS_KEY = "talat-tai-settings";
const BRAND_KEY = "talat-tai-brand";
const SESSION_KEY = "talat-tai-admin-authenticated";
const ADMIN_USER = "owner";
const ADMIN_PASSWORD = "talat2026";
const CLOUD = window.TALAT_TAI_CLOUD || { enabled: false };

const defaultProducts = clone(window.TALAT_TAI_DEFAULT_PRODUCTS || []);
const defaultSettings = clone(window.TALAT_TAI_DEFAULT_SETTINGS || {});
const storedSettings = readJson(SETTINGS_KEY, {});

let products = readJson(PRODUCT_KEY, clone(defaultProducts));
let orders = readJson(ORDER_KEY, []);
let settings = {
  ...defaultSettings,
  ...storedSettings,
  paymentQr: {
    ...(defaultSettings.paymentQr || {}),
    ...(storedSettings.paymentQr || {}),
  },
};

const DEFAULT_COLORS = {
  green: "#17533e",
  gold: "#e0b433",
  paper: "#f7edcf",
  ink: "#27170f",
  terracotta: "#aa3027",
};

// Grouped, labelled field map covering every visible storefront string.
// Sourced from translations.js so the editor and storefront stay in sync.
const TEXT_GROUPS = window.TALAT_TAI_TEXT_GROUPS || [];
const STORE_TRANSLATIONS = window.TALAT_TAI_TRANSLATIONS || { en: {}, th: {}, mm: {} };

let brand = readJson(BRAND_KEY, {
  storeName: "",
  contactEmail: "",
  logoDataUrl: "",
  colors: clone(DEFAULT_COLORS),
  texts: { en: {}, th: {}, mm: {} },
});
let editingProductId = null;
let editingProductImage = null;
let toastTimer;

const elements = {
  loginScreen: document.querySelector("#loginScreen"),
  adminShell: document.querySelector("#adminShell"),
  loginForm: document.querySelector("#loginForm"),
  loginError: document.querySelector("#loginError"),
  logoutButton: document.querySelector("#logoutButton"),
  statsGrid: document.querySelector("#statsGrid"),
  productsTable: document.querySelector("#productsTable"),
  ordersTable: document.querySelector("#ordersTable"),
  productForm: document.querySelector("#productForm"),
  productFormTitle: document.querySelector("#productFormTitle"),
  productPhotoInput: document.querySelector("#productPhotoInput"),
  productPhotoPreview: document.querySelector("#productPhotoPreview"),
  productPhotoPreviewImage: document.querySelector("#productPhotoPreviewImage"),
  productPhotoName: document.querySelector("#productPhotoName"),
  productPhotoStatus: document.querySelector("#productPhotoStatus"),
  removeProductPhotoButton: document.querySelector("#removeProductPhotoButton"),
  newProductButton: document.querySelector("#newProductButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  settingsForm: document.querySelector("#settingsForm"),
  thaiQrInput: document.querySelector("#thaiQrInput"),
  myanmarQrInput: document.querySelector("#myanmarQrInput"),
  cryptoQrInput: document.querySelector("#cryptoQrInput"),
  thaiQrPreview: document.querySelector("#thaiQrPreview"),
  myanmarQrPreview: document.querySelector("#myanmarQrPreview"),
  cryptoQrPreview: document.querySelector("#cryptoQrPreview"),
  qrSettingsCard: document.querySelector(".qr-settings-card"),
  resetProductsButton: document.querySelector("#resetProductsButton"),
  clearOrdersButton: document.querySelector("#clearOrdersButton"),
  exportButton: document.querySelector("#exportButton"),
  toast: document.querySelector("#adminToast"),
  // Brand editor
  saveBrandButton: document.querySelector("#saveBrandButton"),
  resetColorsButton: document.querySelector("#resetColorsButton"),
  brandStoreName: document.querySelector("#brandStoreName"),
  brandEmail: document.querySelector("#brandEmail"),
  brandLogoInput: document.querySelector("#brandLogoInput"),
  brandLogoPreview: document.querySelector("#brandLogoPreview"),
  brandLogoPreviewImage: document.querySelector("#brandLogoPreviewImage"),
  brandLogoName: document.querySelector("#brandLogoName"),
  brandLogoStatus: document.querySelector("#brandLogoStatus"),
  removeBrandLogoButton: document.querySelector("#removeBrandLogoButton"),
  colorGreen: document.querySelector("#colorGreen"),
  colorGold: document.querySelector("#colorGold"),
  colorPaper: document.querySelector("#colorPaper"),
  colorInk: document.querySelector("#colorInk"),
  colorTerracotta: document.querySelector("#colorTerracotta"),
  swatchGreen: document.querySelector("#swatchGreen"),
  swatchGold: document.querySelector("#swatchGold"),
  swatchPaper: document.querySelector("#swatchPaper"),
  swatchInk: document.querySelector("#swatchInk"),
  swatchTerracotta: document.querySelector("#swatchTerracotta"),
  brandLangTabs: document.querySelector("#brandLangTabs"),
  brandTextFields: document.querySelector("#brandTextFields"),
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return `฿${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0)}`;
}

function saveProducts() {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
}

function saveOrders() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function localized(value) {
  return value?.en || "";
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

async function refreshCloudAdminData() {
  if (!CLOUD.enabled) return;
  [products, orders, settings] = await Promise.all([
    CLOUD.getProducts(),
    CLOUD.getOrders(),
    CLOUD.getSettings(),
  ]);
}

async function showDashboard() {
  elements.loginScreen.hidden = true;
  elements.adminShell.hidden = false;
  try {
    await refreshCloudAdminData();
  } catch (error) {
    showToast(error.message);
  }
  // Load the published branding from the cloud so the editor shows what
  // customers currently see.
  if (CLOUD.enabled && settings && settings.brand) {
    brand = settings.brand;
    localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
  }
  renderAll();
  initBrandEditor();
  initAdminNav();
  startOrderNotifications();
  initAdminTeam();
}

// ===== Admin team management =====
async function initAdminTeam() {
  const card = document.querySelector("#adminTeamCard");
  const form = document.querySelector("#addAdminForm");
  if (!card || !form) return;
  if (!CLOUD.enabled || !CLOUD.createAdmin) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  if (!form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.querySelector("#addAdminStatus");
      const submitButton = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form));
      status.textContent = "";
      submitButton.disabled = true;
      try {
        await CLOUD.createAdmin(data.email, data.password);
        form.reset();
        showToast("Admin added.");
        await renderAdminList();
      } catch (error) {
        status.textContent = error.message || "Could not add admin.";
      } finally {
        submitButton.disabled = false;
      }
    });
  }
  renderAdminList();
}

async function renderAdminList() {
  const list = document.querySelector("#adminList");
  if (!list || !CLOUD.listAdmins) return;
  try {
    const admins = await CLOUD.listAdmins();
    if (!admins.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML =
      `<p class="field-label">Current admins</p>` +
      admins
        .map((admin) => `<div class="admin-list-row"><span>${escapeHtml(admin.email || "")}</span></div>`)
        .join("");
  } catch {
    list.innerHTML =
      `<p class="field-label">Run the admin SQL functions in Supabase to list and add your team.</p>`;
  }
}

function showLogin() {
  elements.loginScreen.hidden = false;
  elements.adminShell.hidden = true;
}

// ===== Admin tab navigation =====
function initAdminNav() {
  const nav = document.querySelector("#adminNav");
  if (!nav || nav.dataset.bound) return;
  nav.dataset.bound = "1";
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-page]");
    if (!link) return;
    event.preventDefault();
    showAdminPage(link.dataset.page);
  });
}

function showAdminPage(page) {
  document.querySelectorAll(".admin-page").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });
  document.querySelectorAll("#adminNav a[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
  const dash = document.querySelector(".dashboard");
  if (dash) dash.scrollTop = 0;
  window.scrollTo({ top: 0 });
  // Opening the Orders tab clears the new-order notification badge.
  if (page === "orders") markAllOrdersSeen();
}

// ===== Order notifications =====
let knownOrderRefs = null;
let orderNotifyTimer = null;

const SEEN_ORDERS_KEY = "talat-tai-admin-seen-orders";

function getSeenOrders() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_ORDERS_KEY)) || []);
  } catch {
    return new Set();
  }
}

function markAllOrdersSeen() {
  localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(orders.map((order) => order.reference)));
  updateOrderBadge();
}

// Badge counts only NEW pending orders the admin has not opened yet, so it
// clears as soon as the Orders tab is viewed.
function newOrderCount() {
  const seen = getSeenOrders();
  return orders.filter(
    (order) => order.paymentStatus === "pending_review" && !seen.has(order.reference),
  ).length;
}

function updateOrderBadge() {
  const link = document.querySelector('#adminNav a[data-page="orders"]');
  if (!link) return;
  let badge = link.querySelector(".nav-badge");
  const count = newOrderCount();
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nav-badge";
      link.appendChild(badge);
    }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}

async function fetchLatestOrders() {
  if (CLOUD.enabled) return CLOUD.getOrders();
  return readJson(ORDER_KEY, []);
}

function playOrderBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {
    /* audio unavailable */
  }
}

function notifyNewOrders(newOnes) {
  const first = newOnes[0];
  showToast(
    newOnes.length > 1
      ? `🔔 ${newOnes.length} new orders received`
      : `🔔 New order ${first.reference} · ${money(first.total || 0)}`,
  );
  playOrderBeep();
  if (window.Notification && Notification.permission === "granted") {
    try {
      new Notification("TALAT TAI — New order", {
        body:
          newOnes.length > 1
            ? `${newOnes.length} new orders need review`
            : `${first.reference} · ${money(first.total || 0)}`,
        icon: "assets/talat-tai-logo.png",
      });
    } catch {
      /* ignore */
    }
  }
}

function startOrderNotifications() {
  knownOrderRefs = new Set(orders.map((order) => order.reference));
  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  if (orderNotifyTimer) clearInterval(orderNotifyTimer);
  orderNotifyTimer = setInterval(async () => {
    let fresh;
    try {
      fresh = await fetchLatestOrders();
    } catch {
      return;
    }
    const newOnes = fresh.filter((order) => !knownOrderRefs.has(order.reference));
    if (newOnes.length) {
      orders = fresh;
      newOnes.forEach((order) => knownOrderRefs.add(order.reference));
      renderStats();
      renderOrders();
      notifyNewOrders(newOnes);
    }
  }, 20000);
}

function renderAll() {
  renderStats();
  renderProducts();
  renderOrders();
  renderSettings();
}

function renderStats() {
  const approvedOrders = orders.filter(
    (order) => order.paymentStatus === "approved" || order.status === "paid",
  );
  const revenue = approvedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeProducts = products.filter((product) => product.active !== false).length;
  const lowStock = products.filter((product) => Number(product.stock) <= 3).length;
  const unfulfilled = orders.filter(
    (order) => !["fulfilled", "cancelled", "payment_review"].includes(order.fulfillmentStatus),
  ).length;
  const paymentReview = orders.filter((order) => order.paymentStatus === "pending_review").length;
  const stats = [
    ["Approved revenue", money(revenue)],
    ["Orders", orders.length],
    ["Receipts to review", paymentReview],
    ["Active products", activeProducts],
    ["Needs shipping", unfulfilled],
    ["Low stock", lowStock],
  ];

  elements.statsGrid.innerHTML = stats
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `,
    )
    .join("");
}

function renderProducts() {
  if (products.length === 0) {
    elements.productsTable.innerHTML = `<tr><td colspan="5">No products yet.</td></tr>`;
    return;
  }

  elements.productsTable.innerHTML = products
    .map((product) => {
      const status = product.active === false ? "Hidden" : Number(product.stock) <= 0 ? "Sold out" : "Live";
      const statusClass = product.active === false || Number(product.stock) <= 0 ? "off" : "";
      return `
        <tr>
          <td>
            <div class="product-cell">
              ${product.image?.dataUrl
                ? `<img class="product-table-photo" src="${product.image.dataUrl}" alt="${escapeHtml(localized(product.name))}" />`
                : `<span class="swatch" style="--swatch-bg:${product.background};--swatch-color:${product.color}"></span>`}
              <div>
                <strong>${localized(product.name)}</strong>
                <div class="muted">${localized(product.maker)}</div>
                <div class="muted">${(product.category || []).join(", ")}</div>
              </div>
            </div>
          </td>
          <td>${money(product.price)}</td>
          <td>${product.stock ?? 0}</td>
          <td><span class="status-pill ${statusClass}">${status}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" data-edit="${product.id}">Edit</button>
              <button type="button" data-duplicate="${product.id}">Duplicate</button>
              <button type="button" data-delete="${product.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderOrders() {
  if (orders.length === 0) {
    elements.ordersTable.innerHTML = `<tr><td colspan="7">No orders yet. Complete a demo checkout to see orders here.</td></tr>`;
    return;
  }

  elements.ordersTable.innerHTML = orders
    .map((order) => {
      const customer = order.customer || {};
      const items = (order.items || [])
        .map((item) => `<span>${localized(item.name)} × ${item.quantity}</span>`)
        .join("");
      const paymentStatus =
        order.paymentStatus || (order.status === "paid" ? "approved" : order.status) || "pending_review";
      const paymentLabel = paymentStatus.replace(/_/g, " ");
      const receiptMarkup = order.receipt?.dataUrl
        ? `
          <a class="receipt-thumb" href="${order.receipt.dataUrl}" target="_blank" rel="noreferrer">
            <img src="${order.receipt.dataUrl}" alt="Receipt for ${order.reference}" />
            <span>Open receipt</span>
          </a>
          <div class="muted">${order.receipt.name || "receipt image"}</div>
        `
        : `<span class="status-pill off">No receipt</span>`;
      return `
        <tr>
          <td>
            <strong>${order.reference}</strong>
            <div class="muted">${new Date(order.createdAt).toLocaleString()}</div>
            <div class="muted">${order.paymentMethod || "Payment"}</div>
          </td>
          <td>
            <div class="customer-details">
              <strong>${escapeHtml(customer.name || "Customer")}</strong>
              <div class="muted">Email: ${escapeHtml(customer.email || "Not provided")}</div>
              <div class="muted">Phone: ${escapeHtml(customer.phone || "Not provided")}</div>
              <address>
                ${escapeHtml(customer.address || "No address")}<br />
                ${escapeHtml(customer.district || "")}${customer.district && customer.province ? ", " : ""}${escapeHtml(customer.province || "")}
                ${escapeHtml(customer.postcode || "")}
              </address>
            </div>
          </td>
          <td><div class="order-items">${items}</div></td>
          <td>${money(order.total)}</td>
          <td>${receiptMarkup}</td>
          <td>
            <span class="status-pill ${paymentStatus === "approved" ? "" : "off"}">${paymentLabel}</span>
            <div class="payment-actions">
              <button type="button" data-payment-action="approve" data-order-reference="${order.reference}">
                Approve
              </button>
              <button type="button" data-payment-action="reject" data-order-reference="${order.reference}">
                Reject
              </button>
            </div>
          </td>
          <td>
            <select class="status-select" data-order-status="${order.reference}">
              <option value="payment_review" ${order.fulfillmentStatus === "payment_review" ? "selected" : ""}>Payment review</option>
              <option value="cancelled" ${order.fulfillmentStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
              <option value="unfulfilled" ${order.fulfillmentStatus === "unfulfilled" ? "selected" : ""}>Needs shipping</option>
              <option value="packed" ${order.fulfillmentStatus === "packed" ? "selected" : ""}>Packed</option>
              <option value="shipped" ${order.fulfillmentStatus === "shipped" ? "selected" : ""}>Shipped</option>
              <option value="fulfilled" ${order.fulfillmentStatus === "fulfilled" ? "selected" : ""}>Completed</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join("");
  updateOrderBadge();
}

function renderSettings() {
  const fields = elements.settingsForm.elements;
  fields.shippingFee.value = settings.shippingFee ?? 60;
  fields.freeShippingAt.value = settings.freeShippingAt ?? 1500;
  renderQrPreview("thai");
  renderQrPreview("myanmar");
  renderQrPreview("crypto");
}

function renderQrPreview(method) {
  const preview = elements[`${method}QrPreview`];
  const qr = settings.paymentQr?.[method];
  preview.innerHTML = qr?.dataUrl
    ? `<img src="${qr.dataUrl}" alt="${escapeHtml(qr.label || method)} payment QR" />`
    : "No QR uploaded";
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function resizeQrImage(dataUrl, fileName) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxSize = 700;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let storedDataUrl = canvas.toDataURL("image/png");
      if (storedDataUrl.length > 700 * 1024) {
        storedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
      }
      if (storedDataUrl.length > 700 * 1024) {
        storedDataUrl = canvas.toDataURL("image/jpeg", 0.72);
      }
      resolve({
        dataUrl: storedDataUrl,
        name: fileName,
        uploadedAt: new Date().toISOString(),
      });
    });
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

async function uploadPaymentQr(method, file) {
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    showToast("Please choose a QR image smaller than 8 MB.");
    return;
  }

  try {
    const dataUrl = await readImageFile(file);
    const imageData = await resizeQrImage(dataUrl, file.name);
    const labels = { thai: "Thai QR", myanmar: "Myanmar QR", crypto: "Crypto Payment" };
    if (CLOUD.enabled) {
      const savedQr = await CLOUD.savePaymentQr(method, imageData);
      settings.paymentQr = { ...(settings.paymentQr || {}), [method]: savedQr };
      renderQrPreview(method);
      showToast(`${labels[method]} uploaded to the online store.`);
      return;
    }
    settings.paymentQr = {
      ...(settings.paymentQr || {}),
      [method]: { label: labels[method], ...imageData },
    };
    saveSettings();
    renderQrPreview(method);
    showToast(`${labels[method]} uploaded. Refresh the store to see it.`);
  } catch {
    showToast("Could not save that QR image. Please try a smaller image.");
  }
}

function resetProductForm() {
  const fields = elements.productForm.elements;
  editingProductId = null;
  editingProductImage = null;
  elements.productForm.reset();
  fields.id.value = "";
  fields.active.checked = true;
  fields.background.value = "#e4c453";
  fields.color.value = "#a62f27";
  fields.shape.value = "mug";
  elements.productFormTitle.textContent = "Add product";
  renderProductPhotoPreview();
  elements.productForm.querySelectorAll('[name="category"]').forEach((input) => {
    input.checked = input.value === "home";
  });
}

function fillProductForm(product) {
  const fields = elements.productForm.elements;
  editingProductId = product.id;
  editingProductImage = product.image ? clone(product.image) : null;
  elements.productFormTitle.textContent = "Edit product";
  fields.id.value = product.id;
  fields.nameEn.value = product.name.en || "";
  fields.nameTh.value = product.name.th || "";
  fields.nameMm.value = product.name.mm || "";
  fields.makerEn.value = product.maker.en || "";
  fields.makerTh.value = product.maker.th || "";
  fields.makerMm.value = product.maker.mm || "";
  fields.price.value = product.price || 0;
  fields.stock.value = product.stock || 0;
  fields.badgeEn.value = product.badge.en || "";
  fields.badgeTh.value = product.badge.th || "";
  fields.badgeMm.value = product.badge.mm || "";
  fields.shape.value = product.shape || "mug";
  fields.background.value = product.background || "#e4c453";
  fields.color.value = product.color || "#a62f27";
  fields.active.checked = product.active !== false;
  renderProductPhotoPreview();
  elements.productForm.querySelectorAll('[name="category"]').forEach((input) => {
    input.checked = (product.category || []).includes(input.value);
  });
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
}

function productFromForm() {
  const form = elements.productForm.elements;
  const categories = Array.from(
    elements.productForm.querySelectorAll('[name="category"]:checked'),
  ).map((input) => input.value);
  const id =
    form.id.value ||
    form.nameEn.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    `product-${Date.now()}`;

  return {
    id,
    name: {
      en: form.nameEn.value.trim(),
      th: form.nameTh.value.trim(),
      mm: form.nameMm.value.trim(),
    },
    maker: {
      en: form.makerEn.value.trim(),
      th: form.makerTh.value.trim(),
      mm: form.makerMm.value.trim(),
    },
    price: Number(form.price.value),
    stock: Number(form.stock.value),
    active: form.active.checked,
    category: categories.length ? categories : ["home"],
    badge: {
      en: form.badgeEn.value.trim(),
      th: form.badgeTh.value.trim(),
      mm: form.badgeMm.value.trim(),
    },
    shape: form.shape.value,
    background: form.background.value,
    color: form.color.value,
    image: editingProductImage ? clone(editingProductImage) : null,
  };
}

function renderProductPhotoPreview() {
  const hasPhoto = Boolean(editingProductImage?.dataUrl);
  elements.productPhotoPreview.hidden = !hasPhoto;
  if (hasPhoto) {
    elements.productPhotoPreviewImage.src = editingProductImage.dataUrl;
    elements.productPhotoName.textContent = editingProductImage.name || "Product photo";
    elements.productPhotoStatus.textContent = "Photo ready. Save the product to publish it.";
  } else {
    elements.productPhotoPreviewImage.removeAttribute("src");
    elements.productPhotoName.textContent = "";
    elements.productPhotoStatus.textContent = "No product photo selected.";
  }
}

function resizeProductImage(dataUrl, fileName, originalSize) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxSize = 1000;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let storedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
      if (storedDataUrl.length > 650 * 1024) {
        storedDataUrl = canvas.toDataURL("image/jpeg", 0.68);
      }
      resolve({
        dataUrl: storedDataUrl,
        name: fileName,
        originalSize,
        uploadedAt: new Date().toISOString(),
      });
    });
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

async function handleProductPhoto(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    showToast("Please choose an image smaller than 8 MB.");
    return;
  }

  try {
    elements.productPhotoStatus.textContent = "Preparing photo...";
    const dataUrl = await readImageFile(file);
    editingProductImage = await resizeProductImage(dataUrl, file.name, file.size);
    renderProductPhotoPreview();
  } catch {
    editingProductImage = null;
    renderProductPhotoPreview();
    showToast("Could not prepare that product photo.");
  }
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    products,
    orders,
    settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `talat-tai-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget.elements;
  elements.loginError.textContent = "";
  try {
    if (CLOUD.enabled) {
      await CLOUD.signInAdmin(form.email.value.trim().toLowerCase(), form.password.value);
      await showDashboard();
      return;
    }
    if (form.email.value === ADMIN_USER && form.password.value === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "yes");
      await showDashboard();
      return;
    }
    elements.loginError.textContent = "Wrong demo username or password.";
  } catch (error) {
    elements.loginError.textContent = error.message;
  }
});

elements.logoutButton.addEventListener("click", async () => {
  if (CLOUD.enabled) await CLOUD.signOut();
  localStorage.removeItem(SESSION_KEY);
  showLogin();
});

elements.productPhotoInput.addEventListener("change", async (event) => {
  await handleProductPhoto(event.target.files[0]);
  event.target.value = "";
});

elements.removeProductPhotoButton.addEventListener("click", () => {
  editingProductImage = null;
  renderProductPhotoPreview();
});

elements.productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const product = productFromForm();
  if (CLOUD.enabled) {
    try {
      await CLOUD.saveProduct(product);
      products = await CLOUD.getProducts();
      resetProductForm();
      renderAll();
      showToast("Product saved to the online store.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }
  const previousProducts = clone(products);
  const existingIndex = products.findIndex((item) => item.id === product.id);
  if (existingIndex >= 0) {
    products[existingIndex] = product;
  } else {
    products.push(product);
  }
  try {
    saveProducts();
  } catch {
    products = previousProducts;
    showToast("Browser storage is full. Try a smaller product photo.");
    return;
  }
  resetProductForm();
  renderAll();
  showToast("Product saved. Refresh the store to see changes.");
});

elements.productsTable.addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const duplicateId = event.target.dataset.duplicate;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = products.find((item) => item.id === editId);
    if (product) fillProductForm(product);
  }

  if (duplicateId) {
    const product = products.find((item) => item.id === duplicateId);
    if (!product) return;
    const copy = clone(product);
    copy.id = `${product.id}-${Date.now()}`;
    copy.name.en = `${copy.name.en} Copy`;
    if (CLOUD.enabled) {
      try {
        await CLOUD.saveProduct(copy);
        products = await CLOUD.getProducts();
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      products.push(copy);
      saveProducts();
    }
    renderAll();
    showToast("Product duplicated.");
  }

  if (deleteId && confirm("Delete this product from the storefront?")) {
    if (CLOUD.enabled) {
      try {
        await CLOUD.deleteProduct(deleteId);
        products = await CLOUD.getProducts();
      } catch (error) {
        showToast(error.message);
        return;
      }
    } else {
      products = products.filter((item) => item.id !== deleteId);
      saveProducts();
    }
    renderAll();
    showToast("Product deleted.");
  }
});

elements.ordersTable.addEventListener("change", async (event) => {
  const reference = event.target.dataset.orderStatus;
  if (!reference) return;
  if (CLOUD.enabled) {
    try {
      await CLOUD.updateOrder(reference, { fulfillmentStatus: event.target.value });
      orders = await CLOUD.getOrders();
      renderAll();
      showToast("Online order updated.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }
  orders = orders.map((order) =>
    order.reference === reference
      ? { ...order, fulfillmentStatus: event.target.value }
      : order,
  );
  saveOrders();
  renderAll();
  showToast("Order updated.");
});

elements.ordersTable.addEventListener("click", async (event) => {
  const action = event.target.dataset.paymentAction;
  const reference = event.target.dataset.orderReference;
  if (!action || !reference) return;

  if (CLOUD.enabled) {
    if (action === "reject" && !confirm("Reject this receipt payment?")) return;
    try {
      await CLOUD.reviewOrder(reference, action);
      [orders, products] = await Promise.all([CLOUD.getOrders(), CLOUD.getProducts()]);
      renderAll();
      showToast(action === "approve" ? "Payment receipt approved." : "Payment receipt rejected.");
    } catch (error) {
      showToast(error.message);
    }
    return;
  }

  if (action === "approve") {
    const approvingOrder = orders.find((order) => order.reference === reference);
    if (approvingOrder && approvingOrder.stockAdjusted === false) {
      products = products.map((product) => {
        const item = (approvingOrder.items || []).find((orderItem) => orderItem.id === product.id);
        return item
          ? { ...product, stock: Math.max(0, Number(product.stock || 0) - item.quantity) }
          : product;
      });
      saveProducts();
    }

    orders = orders.map((order) =>
      order.reference === reference
        ? {
            ...order,
            status: "paid",
            paymentStatus: "approved",
            reviewedAt: new Date().toISOString(),
            stockAdjusted: true,
            fulfillmentStatus:
              order.fulfillmentStatus === "payment_review" ? "unfulfilled" : order.fulfillmentStatus,
          }
        : order,
    );
    saveOrders();
    renderAll();
    showToast("Payment receipt approved.");
    return;
  }

  if (action === "reject" && confirm("Reject this receipt payment?")) {
    const rejectedOrder = orders.find((order) => order.reference === reference);
    if (rejectedOrder?.stockAdjusted) {
      products = products.map((product) => {
        const item = (rejectedOrder.items || []).find((orderItem) => orderItem.id === product.id);
        return item ? { ...product, stock: Number(product.stock || 0) + item.quantity } : product;
      });
      saveProducts();
    }

    orders = orders.map((order) =>
      order.reference === reference
        ? {
            ...order,
            status: "rejected",
            paymentStatus: "rejected",
            reviewedAt: new Date().toISOString(),
            fulfillmentStatus: "cancelled",
            stockAdjusted: false,
          }
        : order,
    );
    saveOrders();
    renderAll();
    showToast("Payment receipt rejected.");
  }
});

elements.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = elements.settingsForm.elements;
  settings = {
    ...settings,
    shippingFee: Number(fields.shippingFee.value),
    freeShippingAt: Number(fields.freeShippingAt.value),
  };
  if (CLOUD.enabled) {
    try {
      await CLOUD.saveSettings(settings);
      showToast("Online store settings saved.");
    } catch (error) {
      showToast(error.message);
    }
  } else {
    saveSettings();
    showToast("Settings saved. Refresh the store to apply them.");
  }
});

[
  [elements.thaiQrInput, "thai"],
  [elements.myanmarQrInput, "myanmar"],
  [elements.cryptoQrInput, "crypto"],
].forEach(([input, method]) => {
  input.addEventListener("change", (event) => {
    uploadPaymentQr(method, event.target.files[0]);
    event.target.value = "";
  });
});

elements.qrSettingsCard.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-qr]");
  if (!button) return;
  const method = button.dataset.removeQr;
  const existing = settings.paymentQr?.[method];
  if (!existing?.dataUrl || !confirm(`Remove the ${existing.label || method} image?`)) return;
  if (CLOUD.enabled) {
    settings.paymentQr[method] = await CLOUD.savePaymentQr(method, null);
  } else {
    settings.paymentQr = {
      ...(settings.paymentQr || {}),
      [method]: { ...existing, dataUrl: "", name: "", uploadedAt: "" },
    };
    saveSettings();
  }
  renderQrPreview(method);
  showToast("Payment QR removed.");
});

elements.newProductButton.addEventListener("click", resetProductForm);
elements.cancelEditButton.addEventListener("click", resetProductForm);
elements.exportButton.addEventListener("click", exportData);

elements.resetProductsButton.addEventListener("click", () => {
  if (CLOUD.enabled) {
    showToast("Online product reset is disabled to protect live store data.");
    return;
  }
  if (!confirm("Reset all products to the original TALAT TAI demo products?")) return;
  products = clone(defaultProducts);
  saveProducts();
  resetProductForm();
  renderAll();
  showToast("Products reset.");
});

elements.clearOrdersButton.addEventListener("click", () => {
  if (CLOUD.enabled) {
    showToast("Online order deletion is disabled to protect business records.");
    return;
  }
  if (!confirm("Clear all demo orders?")) return;
  orders = [];
  saveOrders();
  renderAll();
  showToast("Orders cleared.");
});

// ===== BRAND EDITOR =====

function saveBrand() {
  localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
}

const SOCIAL_KEYS = ["facebook", "line", "telegram", "viber"];

function socialInput(key) {
  return document.querySelector(`#social${key.charAt(0).toUpperCase()}${key.slice(1)}`);
}

function renderBrandForm() {
  if (!elements.brandStoreName) return;

  // Populate brand identity fields
  elements.brandStoreName.value = brand.storeName || "";
  elements.brandEmail.value = brand.contactEmail || "";

  // Social links
  const social = brand.social || {};
  SOCIAL_KEYS.forEach((key) => {
    const input = socialInput(key);
    if (input) input.value = social[key] || "";
  });

  // Logo preview
  updateLogoPreview(brand.logoDataUrl);

  // Colors
  const colors = { ...DEFAULT_COLORS, ...(brand.colors || {}) };
  elements.colorGreen.value = colors.green;
  elements.colorGold.value = colors.gold;
  elements.colorPaper.value = colors.paper;
  elements.colorInk.value = colors.ink;
  elements.colorTerracotta.value = colors.terracotta;
  updateSwatches(colors);

  // Text fields (default to English)
  renderTextFields("en");
}

function updateLogoPreview(dataUrl) {
  if (dataUrl) {
    elements.brandLogoPreviewImage.src = dataUrl;
    elements.brandLogoPreview.hidden = false;
    elements.brandLogoStatus.textContent = "Custom logo uploaded.";
  } else {
    elements.brandLogoPreview.hidden = true;
    elements.brandLogoStatus.textContent = "No logo uploaded — default logo in use.";
  }
}

function updateSwatches(colors) {
  elements.swatchGreen.style.background = colors.green;
  elements.swatchGold.style.background = colors.gold;
  elements.swatchPaper.style.background = colors.paper;
  elements.swatchInk.style.background = colors.ink;
  elements.swatchTerracotta.style.background = colors.terracotta;
}

function previewColorsLive() {
  // No cross-page preview from admin — just update swatches
  const colors = getCurrentColors();
  updateSwatches(colors);
}

function getCurrentColors() {
  return {
    green: elements.colorGreen.value,
    gold: elements.colorGold.value,
    paper: elements.colorPaper.value,
    ink: elements.colorInk.value,
    terracotta: elements.colorTerracotta.value,
  };
}

let activeBrandLang = "en";

function renderTextFields(lang) {
  activeBrandLang = lang;
  const texts = brand.texts?.[lang] || {};
  const container = elements.brandTextFields;
  container.innerHTML = "";

  TEXT_GROUPS.forEach((groupDef, groupIndex) => {
    const editedCount = groupDef.fields.filter((f) => texts[f.key]).length;

    const group = document.createElement("section");
    group.className = "brand-text-group";
    // Open the first section by default; keep the rest collapsed for a tidy view.
    group.dataset.open = groupIndex === 0 ? "true" : "false";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "brand-text-group-toggle";
    toggle.setAttribute("aria-expanded", group.dataset.open);
    toggle.innerHTML =
      `<span class="brand-text-group-title">${escapeHtml(groupDef.title)}</span>` +
      `<span class="brand-text-group-meta">` +
      `<span class="brand-text-group-count"${editedCount ? "" : " hidden"}>${editedCount} edited</span>` +
      `<span class="brand-text-group-chevron" aria-hidden="true">▾</span></span>`;
    group.appendChild(toggle);

    const body = document.createElement("div");
    body.className = "brand-text-group-body";

    groupDef.fields.forEach(({ key, label, type }) => {
      const lbl = document.createElement("label");
      let field;
      if (type === "textarea") {
        field = document.createElement("textarea");
        field.rows = 3;
      } else {
        field = document.createElement("input");
        field.type = "text";
      }
      field.dataset.textKey = key;
      field.value = texts[key] || "";
      const fallback = getDefaultText(lang, key);
      if (fallback) field.placeholder = `Default: ${fallback}`;
      lbl.textContent = label;
      lbl.appendChild(field);
      body.appendChild(lbl);
    });

    group.appendChild(body);
    container.appendChild(group);
  });

  // Update tab active state
  elements.brandLangTabs.querySelectorAll(".lang-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.lang === lang);
  });
}

function getDefaultText(lang, key) {
  // Show the real shipped wording so the seller knows what they are replacing.
  return STORE_TRANSLATIONS[lang]?.[key] || STORE_TRANSLATIONS.en?.[key] || "";
}

function collectTextFields() {
  const lang = activeBrandLang;
  if (!brand.texts) brand.texts = {};
  if (!brand.texts[lang]) brand.texts[lang] = {};
  elements.brandTextFields.querySelectorAll("[data-text-key]").forEach(field => {
    const key = field.dataset.textKey;
    const value = field.value.trim();
    // Only store real overrides. Empty fields fall back to the shipped default
    // on the storefront, so clearing a field restores the original wording.
    if (value) {
      brand.texts[lang][key] = value;
    } else {
      delete brand.texts[lang][key];
    }
  });
}

// ===== BRAND EVENT LISTENERS =====
async function initBrandEditor() {
  if (!elements.saveBrandButton) return;

  renderBrandForm();

  elements.saveBrandButton.addEventListener("click", async () => {
    collectTextFields();
    brand.storeName = elements.brandStoreName.value.trim();
    brand.contactEmail = elements.brandEmail.value.trim();
    brand.colors = getCurrentColors();
    brand.social = {};
    SOCIAL_KEYS.forEach((key) => {
      const input = socialInput(key);
      if (input && input.value.trim()) brand.social[key] = input.value.trim();
    });
    saveBrand();
    // Publish the whole storefront editor to the cloud so every customer sees it.
    if (CLOUD.enabled && CLOUD.saveBrand) {
      try {
        await CLOUD.saveBrand(brand);
        showToast("Saved. Your storefront is now live for all customers.");
        return;
      } catch (error) {
        showToast(
          "Saved on this device. Add the 'brand' column in Supabase to publish to all customers.",
        );
        return;
      }
    }
    showToast("Storefront settings saved. Refresh the store to see changes.");
  });

  elements.resetColorsButton.addEventListener("click", () => {
    if (!confirm("Reset colors to TALAT TAI defaults?")) return;
    brand.colors = clone(DEFAULT_COLORS);
    elements.colorGreen.value = DEFAULT_COLORS.green;
    elements.colorGold.value = DEFAULT_COLORS.gold;
    elements.colorPaper.value = DEFAULT_COLORS.paper;
    elements.colorInk.value = DEFAULT_COLORS.ink;
    elements.colorTerracotta.value = DEFAULT_COLORS.terracotta;
    updateSwatches(DEFAULT_COLORS);
  });

  // Live swatch preview on color change
  [elements.colorGreen, elements.colorGold, elements.colorPaper, elements.colorInk, elements.colorTerracotta]
    .forEach(input => input.addEventListener("input", previewColorsLive));

  // Logo upload
  elements.brandLogoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      brand.logoDataUrl = ev.target.result;
      elements.brandLogoName.textContent = file.name;
      updateLogoPreview(brand.logoDataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });

  elements.removeBrandLogoButton.addEventListener("click", () => {
    brand.logoDataUrl = "";
    updateLogoPreview("");
  });

  // Language tabs
  elements.brandLangTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".lang-tab");
    if (!tab) return;
    collectTextFields();
    renderTextFields(tab.dataset.lang);
  });

  // Collapsible text sections (accordion) to keep the editor tidy.
  elements.brandTextFields.addEventListener("click", (e) => {
    const toggle = e.target.closest(".brand-text-group-toggle");
    if (!toggle) return;
    const group = toggle.closest(".brand-text-group");
    const open = group.dataset.open === "true";
    group.dataset.open = open ? "false" : "true";
    toggle.setAttribute("aria-expanded", String(!open));
  });
}

async function initializeAdmin() {
  resetProductForm();
  if (CLOUD.enabled) {
    try {
      if (await CLOUD.isAdmin()) {
        await showDashboard();
      } else {
        showLogin();
      }
    } catch (error) {
      showLogin();
      elements.loginError.textContent = error.message;
    }
    return;
  }
  if (localStorage.getItem(SESSION_KEY) === "yes") {
    await showDashboard();
  } else {
    showLogin();
  }
}

initializeAdmin();
