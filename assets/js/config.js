export const BASE_PATH = /^\/tienda(?:\/|$)/.test(window.location.pathname) ? "/tienda" : "";

export function withBase(path = "/") {
  if (path === "/") return BASE_PATH ? `${BASE_PATH}/` : "/";
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
