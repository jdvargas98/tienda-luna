const STORAGE_KEY = "luna_creativa_tienda";
const UPLOAD_SESSION_KEY = "luna_creativa_upload_session";

const initialState = {
  currentProductSlug: "",
  selectedVariant: null,
  personalization: {
    photoUrl: "",
    photoUploadId: 0,
    photoUploadToken: "",
    photoFieldCode: "",
    values: {},
  },
  cart: [],
  checkout: {},
  lastOrder: null,
};

export const state = loadState();

export function saveState() {
  const serializableState = {
    ...state,
    lastOrder: state.lastOrder ? { ...state.lastOrder, code: "" } : null,
    personalization: {
      ...state.personalization,
      photoUrl: state.personalization.photoUrl?.startsWith("blob:") ? "" : state.personalization.photoUrl,
      photoUploadToken: "",
    },
    cart: state.cart.map((item) => ({
      ...item,
      personalization: {
        ...item.personalization,
        photoUrl: item.personalization.photoUrl?.startsWith("blob:") ? "" : item.personalization.photoUrl,
        photoUploadToken: "",
      },
    })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState));
}

export function hydrateProductState(product) {
  if (!product) return;

  const productChanged = state.currentProductSlug !== product.slug;
  const variants = product.variantes || [];
  const firstVariant = normalizeVariant(variants[0]);
  const selectedStillExists = variants.some((variant) => String(variant.id) === String(state.selectedVariant?.id));

  if (state.currentProductSlug !== product.slug || !selectedStillExists) {
    state.selectedVariant = firstVariant;
  }
  state.currentProductSlug = product.slug;

  const nextValues = {};
  (product.opciones_producto || []).forEach((field) => {
    if (state.personalization.values[field.codigo] != null) {
      nextValues[field.codigo] = state.personalization.values[field.codigo];
      return;
    }
    nextValues[field.codigo] = Array.isArray(field.valores) && field.valores.length > 0 ? String(field.valores[0].valor) : "";
  });

  (product.personalizaciones || []).forEach((field) => {
    if (field.tipo === "foto") return;
    if (state.personalization.values[field.codigo] != null) {
      nextValues[field.codigo] = state.personalization.values[field.codigo];
      return;
    }
    nextValues[field.codigo] = Array.isArray(field.opciones) && field.opciones.length > 0 ? String(field.opciones[0]) : "";
  });

  state.personalization = {
    photoUrl: productChanged ? "" : state.personalization.photoUrl || "",
    photoUploadId: productChanged ? 0 : Number(state.personalization.photoUploadId || 0),
    photoUploadToken: productChanged ? "" : state.personalization.photoUploadToken || "",
    photoFieldCode: productChanged ? "" : state.personalization.photoFieldCode || "",
    values: nextValues,
  };

  saveState();
}

export function setVariant(variant) {
  state.selectedVariant = normalizeVariant(variant);
  saveState();
}

export function updatePersonalizationValue(code, value) {
  state.personalization = {
    ...state.personalization,
    values: {
      ...state.personalization.values,
      [code]: value,
    },
  };
  saveState();
}

export function updatePhotoUrl(photoUrl, upload = {}) {
  state.personalization = {
    ...state.personalization,
    photoUrl,
    photoUploadId: Number(upload.uploadId || 0),
    photoUploadToken: upload.uploadToken || "",
    photoFieldCode: upload.fieldCode || "",
  };
  saveState();
}

export function addConfiguredProductToCart(product) {
  const variant = resolveConfiguredVariant(product);
  state.cart = [
    {
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      image: product.imagen_principal || product.imagenes?.[0]?.url || "",
      variant: { ...variant },
      personalization: {
        photoUrl: state.personalization.photoUrl,
        photoUploadId: Number(state.personalization.photoUploadId || 0),
        photoUploadToken: state.personalization.photoUploadToken || "",
        photoFieldCode: state.personalization.photoFieldCode || "",
        values: { ...state.personalization.values },
      },
      quantity: 1,
      unitPrice: variant?.price || Number(product.precio_base || 0),
    },
  ];
  saveState();
}

export function updateQuantity(delta) {
  const [item] = state.cart;
  if (!item) return;
  const nextQuantity = item.quantity + Number(delta);
  if (nextQuantity <= 0) {
    state.cart = [];
    saveState();
    return;
  }
  item.quantity = nextQuantity;
  saveState();
}

export function removeCartItem() {
  state.cart = [];
  saveState();
}

export function cartSubtotal() {
  return state.cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function cartQuantity() {
  return state.cart.reduce((total, item) => total + item.quantity, 0);
}

export function createOrder(checkoutData) {
  state.checkout = checkoutData;
  state.lastOrder = {
    code: "",
    createdAt: new Date().toISOString(),
    statusIndex: 0,
    total: cartSubtotal(),
  };
  saveState();
}

function normalizeVariant(variant) {
  if (!variant) return null;
  return {
    id: variant.id,
    label: variant.nombre || variant.label || "Variante",
    size: variant.sku || variant.size || "",
    price: Number(variant.precio ?? variant.price ?? 0),
    raw: variant,
  };
}

function resolveConfiguredVariant(product) {
  const pricingField = (product.opciones_producto || []).find((field) => Array.isArray(field.valores) && field.valores.length > 0);
  if (pricingField) {
    const selectedValue = String(state.personalization.values[pricingField.codigo] || pricingField.valores[0]?.valor || "");
    const selectedOption =
      pricingField.valores.find((option) => String(option.valor) === selectedValue) || pricingField.valores[0] || null;

    if (selectedOption) {
      return {
        id: `option-${pricingField.id}-${selectedOption.id}`,
        label: selectedOption.label || pricingField.label || "Opcion",
        size: pricingField.label || "",
        price: Number(selectedOption.precio || product.precio_base || 0),
        raw: selectedOption,
      };
    }
  }

  return state.selectedVariant || normalizeVariant(product.variantes?.[0]);
}

function loadState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...initialState,
      ...storedState,
      selectedVariant: storedState?.selectedVariant || null,
      personalization: {
        photoUrl: storedState?.personalization?.photoUrl || "",
        photoUploadId: Number(storedState?.personalization?.photoUploadId || 0),
        photoUploadToken: currentUploadToken(),
        photoFieldCode: storedState?.personalization?.photoFieldCode || "",
        values: storedState?.personalization?.values || {},
      },
      cart: (storedState?.cart || []).map((item) => ({
        ...item,
        personalization: {
          ...(item.personalization || {}),
          photoUploadToken: item.personalization?.photoUploadId ? currentUploadToken() : "",
        },
      })),
      checkout: storedState?.checkout || {},
      lastOrder: storedState?.lastOrder || null,
    };
  } catch {
    return cloneInitialState();
  }
}

function cloneInitialState() {
  return {
    ...initialState,
    personalization: {
      photoUrl: "",
      photoUploadId: 0,
      photoUploadToken: "",
      photoFieldCode: "",
      values: {},
    },
    cart: [],
    checkout: {},
    lastOrder: null,
  };
}

function currentUploadToken() {
  try {
    const session = JSON.parse(sessionStorage.getItem(UPLOAD_SESSION_KEY) || "null");
    return session?.upload_token || "";
  } catch {
    return "";
  }
}
