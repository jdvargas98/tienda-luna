export const BASE_PATH = window.location.pathname.startsWith("/tienda") ? "/tienda" : "";

export function withBase(path = "/") {
  if (path === "/") return BASE_PATH ? `${BASE_PATH}/` : "/";
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
