import { withBase } from "./config.js?v=20260512-hero-regalos";

export async function fetchCatalog() {
  return fetchStoreJson(withBase("/api/tienda_publica.php?action=catalogo"));
}

export async function fetchProductDetail(slug) {
  return fetchStoreJson(withBase(`/api/tienda_publica.php?action=detalle&slug=${encodeURIComponent(slug)}`));
}

export async function uploadPersonalizationFile(file, campo = "personalizacion") {
  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("campo", campo);

  return fetchStoreJson(withBase("/api/tienda_subir_personalizacion.php"), {
    method: "POST",
    body: formData,
  });
}

export async function fetchOrderTracking(code) {
  return fetchStoreJson(withBase("/api/consultar_estado_pedido.php"), {
    method: "POST",
    body: JSON.stringify({ token: code, codigo: code }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function fetchColombiaDepartments() {
  const departments = await fetchExternalJson(withBase("/api/colombia_ubicaciones.php?action=departamentos"));
  return departments
    .map((department) => ({
      id: department.id,
      name: department.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function fetchColombiaCities(departmentId) {
  const cities = await fetchExternalJson(withBase(`/api/colombia_ubicaciones.php?action=municipios&department_id=${encodeURIComponent(departmentId)}`));
  return cities
    .map((city) => ({
      id: city.id,
      name: city.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

async function fetchStoreJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    credentials: "same-origin",
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("La API no devolvio JSON valido");
  }

  const payload = await response.json();
  if (!response.ok || payload.status !== "success") {
    throw new Error(payload.message || "No fue posible cargar la tienda");
  }

  return payload;
}

async function fetchExternalJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("No fue posible cargar ubicaciones de Colombia");
  }

  return response.json();
}
