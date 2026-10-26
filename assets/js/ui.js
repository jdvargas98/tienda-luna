import { cartQuantity } from "./cart.js?v=20260903-product-copy-v3";
import { BASE_PATH, withBase } from "./config.js?v=20260823-product-route";
import { footerTemplate } from "./footer-template.js?v=20261023-legal";
import { bindFooterSubscription } from "./footer.js?v=20261023-footer";

function resolvePartialUrls(html) {
  return html.replaceAll("__BASE__", BASE_PATH).replaceAll("__HOME__", BASE_PATH);
}

export function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function loadShell() {
  await Promise.all([
    injectPartial("#siteHeader", withBase("/components/header.html?v=20261022-menu-compacto")),
    injectPartial("#siteFooter", withBase("/components/footer.html?v=20261023-legal")),
  ]);
  bindNavigationMenu();
  updateCartBadge();
  updateFooterYear();
  bindFooterSubscription(document.querySelector(".global-footer"));
}

export function updateCartBadge() {
  const badge = document.querySelector("#cartBadge");
  if (badge) badge.textContent = cartQuantity();
}

function updateFooterYear() {
  document.querySelectorAll("[data-current-year]").forEach((item) => {
    item.textContent = new Date().getFullYear();
  });
}

export function setActiveRoute(path) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === path);
  });
}

function bindNavigationMenu() {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector("#siteMenu");
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

async function injectPartial(selector, url) {
  const target = document.querySelector(selector);
  if (!target) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    target.innerHTML = resolvePartialUrls(await response.text());
  } catch {
    target.innerHTML = fallbackPartial(selector);
  }
}

function fallbackPartial(selector) {
  if (selector === "#siteHeader") {
    return `
      <header class="site-header">
        <nav class="nav-shell" aria-label="Navegacion principal">
          <a class="brand" href="${withBase("/")}" data-route="/" aria-label="Luna Creativa tienda">
            <img src="${withBase("/assets/img/logo/luna-creativa.png")}" alt="Logo Luna Creativa" width="42" height="42">
          </a>
          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteMenu">Menu</button>
          <div class="nav-links" id="siteMenu">
            <a href="${withBase("/")}" data-route="/">Inicio</a>
            <a href="${withBase("/servicios/")}" data-route="/servicios">Servicios</a>
            <a href="${withBase("/catalogo/")}" data-route="/catalogo">Productos</a>
            <a href="${withBase("/visita/")}" data-route="/visita">Agendar visita</a>
            <a href="${withBase("/seguimiento/")}" data-route="/seguimiento">Seguimiento</a>
          </div>
          <form class="site-search" id="siteSearch" role="search">
            <input id="siteSearchInput" type="search" autocomplete="off" placeholder="Buscar productos..." aria-label="Buscar productos">
            <button type="submit" aria-label="Buscar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
            </button>
            <div class="site-search__suggestions" id="siteSearchSuggestions" aria-live="polite"></div>
          </form>
          <a class="cart-link" href="${withBase("/carrito/")}" data-route="/carrito">Carrito <span id="cartBadge">0</span></a>
        </nav>
      </header>
    `;
  }

  return resolvePartialUrls(footerTemplate);
}
