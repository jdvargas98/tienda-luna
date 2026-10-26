const STORAGE_KEY = "luna_creativa_tienda";
const UPLOAD_SESSION_KEY = "luna_creativa_upload_session";
const STATE_VERSION = 3;

const initialState = { version: STATE_VERSION, draft: null, cart: [], checkout: {}, lastOrder: null };

export const state = loadState();

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: STATE_VERSION,
    draft: sanitizeDraft(state.draft),
    cart: state.cart.map(sanitizeCartItem),
    checkout: state.checkout || {},
    lastOrder: state.lastOrder ? { ...state.lastOrder, code: "" } : null,
  }));
}

export function hydrateProductState(product, editCartItemId = "") {
  if (!product) return;
  if (editCartItemId) {
    const item = state.cart.find((entry) => entry.id === editCartItemId);
    if (item && item.productSlug === product.slug) {
      if (state.draft?.editingCartItemId !== item.id) {
        state.draft = {
          productSlug: product.slug,
          editingCartItemId: item.id,
          variant: normalizeVariant(item.variant),
          personalization: rehydratePersonalization(item.personalization, currentUploadToken()),
        };
        saveState();
      }
      return;
    }
  }
  if (!state.draft || state.draft.productSlug !== product.slug || state.draft.editingCartItemId) {
    state.draft = {
      productSlug: product.slug,
      editingCartItemId: "",
      variant: normalizeVariant(product.variantes?.[0]),
      personalization: defaultPersonalization(product),
    };
    saveState();
  }
}

export function activePersonalization() {
  return state.draft?.personalization || { photoUrl: "", photoUploadId: 0, photoUploadToken: "", photoFieldCode: "", values: {} };
}

export function activeVariant() { return state.draft?.variant || null; }
export function editingCartItemId() { return state.draft?.editingCartItemId || ""; }

export function setVariant(variant) {
  if (!state.draft) return;
  state.draft.variant = normalizeVariant(variant);
  saveState();
}

export function updatePersonalizationValue(code, value) {
  if (!state.draft || !code) return;
  state.draft.personalization.values = { ...(state.draft.personalization.values || {}), [code]: value };
  saveState();
}

export function updatePhotoUrl(photoUrl, upload = {}) {
  if (!state.draft) return;
  state.draft.personalization = {
    ...activePersonalization(),
    photoUrl: photoUrl || "",
    photoUploadId: Number(upload.uploadId || 0),
    photoUploadToken: upload.uploadToken || "",
    photoFieldCode: upload.fieldCode || activePersonalization().photoFieldCode || "foto",
  };
  saveState();
}

export function validateActiveConfiguration(product) {
  const personalization = activePersonalization();
  return (product?.personalizaciones || []).flatMap((field) => {
    if (!(field.requerido === true || field.requerido === 1 || field.requerido === "1")) return [];
    if (field.tipo === "foto") {
      return personalization.photoUrl && personalization.photoUploadId && personalization.photoUploadToken
        ? []
        : [`Carga ${String(field.label || "la imagen requerida").toLowerCase()}.`];
    }
    return String(personalization.values?.[field.codigo] ?? "").trim()
      ? []
      : [`Completa ${String(field.label || field.codigo).toLowerCase()}.`];
  });
}

export function addConfiguredProductToCart(product) {
  if (!state.draft) throw new Error("No hay una configuración activa para este producto.");
  const variant = resolveConfiguredVariant(product, state.draft);
  const personalization = rehydratePersonalization(activePersonalization(), currentUploadToken());
  const editingId = editingCartItemId();
  const existingIndex = editingId ? state.cart.findIndex((item) => item.id === editingId) : -1;
  const existing = existingIndex >= 0 ? state.cart[existingIndex] : null;
  const item = {
    id: existing?.id || createItemId(), productId: Number(product.id || 0), productSlug: product.slug || "",
    productName: product.nombre || "Producto", image: product.imagen_principal || product.imagenes?.[0]?.url || "",
    variant, personalization, opciones: selectedProductOptionIds(product, state.draft), quantity: existing?.quantity || 1,
    unitPrice: Number(variant?.price || product.precio_base || 0),
  };
  if (existingIndex >= 0) state.cart.splice(existingIndex, 1, item); else state.cart.push(item);
  state.draft = null;
  saveState();
  return item;
}

export function updateQuantity(itemId, delta) {
  const item = state.cart.find((entry) => entry.id === itemId);
  if (!item) return;
  const nextQuantity = item.quantity + Number(delta);
  if (nextQuantity <= 0) return removeCartItem(itemId);
  item.quantity = nextQuantity;
  saveState();
}

export function removeCartItem(itemId) {
  state.cart = state.cart.filter((item) => item.id !== itemId);
  if (state.draft?.editingCartItemId === itemId) state.draft = null;
  saveState();
}

export function cartSubtotal() { return state.cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0); }
export function cartQuantity() { return state.cart.reduce((total, item) => total + item.quantity, 0); }

export function checkoutCartItems() {
  const uploadToken = currentUploadToken();
  return state.cart.map((item) => ({
    tienda_producto_id: Number(item.productId || 0), slug: item.productSlug || "", cantidad: Number(item.quantity || 1),
    opciones: [...(item.opciones || [])], personalizaciones: checkoutPersonalizations(item.personalization, uploadToken),
  }));
}

export function createOrder(checkoutData) {
  state.checkout = checkoutData;
  state.lastOrder = { code: checkoutData.code || "", orderCode: checkoutData.serverOrder?.codigo || "", createdAt: new Date().toISOString(), statusIndex: 0, total: cartSubtotal() };
  saveState();
}

function defaultPersonalization(product) {
  const values = {};
  (product.opciones_producto || []).forEach((field) => { if (field.valores?.length) values[field.codigo] = String(field.valores[0].valor ?? ""); });
  (product.personalizaciones || []).forEach((field) => {
    if ((field.tipo === "select" || field.tipo === "opciones") && field.opciones?.length) values[field.codigo] = String(field.opciones[0]);
  });
  return { photoUrl: "", photoUploadId: 0, photoUploadToken: "", photoFieldCode: "", values };
}

function normalizeVariant(variant) {
  if (!variant) return null;
  return { id: variant.id ?? null, label: variant.nombre || variant.label || "Configuración seleccionada", size: variant.sku || variant.size || "", price: Number(variant.precio ?? variant.price ?? 0), raw: variant.raw || variant };
}

function resolveConfiguredVariant(product, draft) {
  const field = (product.opciones_producto || []).find((entry) => Array.isArray(entry.valores) && entry.valores.length);
  if (field) {
    const value = String(draft.personalization?.values?.[field.codigo] ?? field.valores[0]?.valor ?? "");
    const option = field.valores.find((entry) => String(entry.valor) === value) || field.valores[0];
    if (option) return { id: `option-${field.id}-${option.id}`, label: option.label || field.label || "Opción", size: field.label || "", price: Number(option.precio || product.precio_base || 0), raw: option };
  }
  return draft.variant || { id: null, label: "Precio fijo", size: "", price: Number(product.precio_base || 0), raw: null };
}

function selectedProductOptionIds(product, draft) {
  return (product?.opciones_producto || []).flatMap((field) => {
    const raw = draft.personalization?.values?.[field.codigo];
    const selected = Array.isArray(raw) ? raw.map(String) : [String(raw ?? "")];
    return (field.valores || []).filter((option) => selected.includes(String(option.valor))).map((option) => Number(option.id || 0)).filter(Boolean);
  });
}

function checkoutPersonalizations(personalization = {}, uploadToken = "") {
  const values = { ...(personalization.values || {}) };
  if (personalization.photoUploadId && personalization.photoFieldCode) {
    values[personalization.photoFieldCode] = { upload_id: Number(personalization.photoUploadId), upload_token: personalization.photoUploadToken || uploadToken };
  }
  return values;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return cloneInitialState();
    const token = currentUploadToken();
    return { version: STATE_VERSION, draft: stored.version === STATE_VERSION && stored.draft ? { ...stored.draft, personalization: rehydratePersonalization(stored.draft.personalization, token) } : null, cart: (stored.cart || []).map((item) => normalizeStoredCartItem(item, token)), checkout: stored.checkout || {}, lastOrder: stored.lastOrder || null };
  } catch { return cloneInitialState(); }
}

function normalizeStoredCartItem(item, token) {
  const legacyEntry = Object.entries(item.design?.assets || {}).find(([, asset]) => asset?.type === "image") || [];
  const [legacyField = "", legacyPhoto = {}] = legacyEntry;
  const source = item.personalization || { photoUrl: legacyPhoto.url || "", photoUploadId: Number(legacyPhoto.uploadId || 0), photoFieldCode: legacyField, values: item.design?.fields || {} };
  return { id: item.id || createItemId(), productId: Number(item.productId || 0), productSlug: item.productSlug || "", productName: item.productName || "Producto", image: item.image || "", variant: normalizeVariant(item.variant), personalization: rehydratePersonalization(source, token), opciones: Array.isArray(item.opciones) ? item.opciones.map(Number).filter(Boolean) : [], quantity: Math.max(1, Number(item.quantity || 1)), unitPrice: Number(item.unitPrice || 0) };
}

function sanitizeDraft(draft) { return draft ? { ...draft, personalization: sanitizePersonalization(draft.personalization) } : null; }
function sanitizeCartItem(item) { return { ...item, personalization: sanitizePersonalization(item.personalization) }; }
function sanitizePersonalization(p = {}) { return { photoUrl: String(p.photoUrl || "").startsWith("blob:") ? "" : p.photoUrl || "", photoUploadId: Number(p.photoUploadId || 0), photoUploadToken: "", photoFieldCode: p.photoFieldCode || "", values: p.values || {} }; }
function rehydratePersonalization(p = {}, token = "") { return { photoUrl: p.photoUrl || "", photoUploadId: Number(p.photoUploadId || 0), photoUploadToken: p.photoUploadId ? token : "", photoFieldCode: p.photoFieldCode || "", values: p.values || {} }; }

function currentUploadToken() {
  try { return JSON.parse(sessionStorage.getItem(UPLOAD_SESSION_KEY) || "null")?.upload_token || ""; } catch { return ""; }
}

function createItemId() { return globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function cloneInitialState() { return { ...initialState, cart: [], checkout: {}, lastOrder: null }; }
