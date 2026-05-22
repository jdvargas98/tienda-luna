import { cartQuantity } from "./cart.js?v=20260512-hero-regalos";
import { BASE_PATH, withBase } from "./config.js?v=20260512-hero-regalos";

export function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function loadShell() {
  await Promise.all([
    injectPartial("#siteHeader", withBase("/components/header.html")),
    injectPartial("#siteFooter", withBase("/components/footer.html")),
  ]);
  bindNavigationMenu();
  updateCartBadge();
  updateFooterYear();
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
    target.innerHTML = (await response.text()).replaceAll("__BASE__", BASE_PATH);
  } catch {
    target.innerHTML = fallbackPartial(selector);
  }
}

function fallbackPartial(selector) {
  if (selector === "#siteHeader") {
    return `
      <header class="site-header">
        <div class="campaign-topbar">
          <a href="${withBase("/catalogo/")}" data-route="/catalogo">
            <span data-campaign-kicker>Temporada activa</span>
            <strong data-campaign-title>Regalos personalizados para empresas</strong>
            <span data-campaign-offer>Agenda tu pedido con anticipacion</span>
          </a>
        </div>
        <nav class="nav-shell" aria-label="Navegacion principal">
          <a class="brand" href="${withBase("/")}" data-route="/">
            <img src="${withBase("/assets/img/logo/luna-creativa.png")}" alt="Logo Luna Creativa" width="42" height="42">
            <span>Luna Creativa</span>
          </a>
          <form class="site-search" id="siteSearch" role="search">
            <input id="siteSearchInput" type="search" autocomplete="off" placeholder="Buscar regalos, rompecabezas, mugs...">
            <button type="submit" aria-label="Buscar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
            </button>
            <div class="site-search__suggestions" id="siteSearchSuggestions" aria-live="polite"></div>
          </form>
          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteMenu">Menu</button>
          <div class="nav-links" id="siteMenu">
            <a href="${withBase("/")}" data-route="/">Inicio</a>
            <a href="${withBase("/catalogo/")}" data-route="/catalogo">Productos</a>
            <a href="${withBase("/seguimiento/")}" data-route="/seguimiento">Seguimiento</a>
            <a class="cart-link" href="${withBase("/carrito/")}" data-route="/carrito">Carrito <span id="cartBadge">0</span></a>
          </div>
        </nav>
        <div class="campaign-countdown">
          <span data-campaign-countdown-label>Campana activa</span>
          <strong data-campaign-countdown>00d 00h 00m 00s</strong>
          <a href="${withBase("/producto/")}" data-route="/producto">Personalizar ahora</a>
        </div>
      </header>
    `;
  }

  return `
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="footer-brand">
          <a class="footer-logo" href="${withBase("/")}" data-route="/" aria-label="Luna Creativa tienda">
            <img src="${withBase("/assets/img/logo/luna-creativa.png")}" alt="Logo Luna Creativa" width="46" height="46">
            <span>Luna Creativa</span>
          </a>
          <p>Regalos personalizados para empresas que quieren entregar detalles memorables.</p>
        </div>
        <nav class="footer-column" aria-label="Pedidos">
          <h3>Pedidos</h3>
          <a href="${withBase("/carrito/")}" data-route="/carrito">Carrito</a>
          <a href="${withBase("/checkout/")}" data-route="/checkout">Checkout</a>
          <a href="${withBase("/seguimiento/")}" data-route="/seguimiento">Rastreo</a>
        </nav>
        <nav class="footer-column" aria-label="Empresas">
          <h3>Empresas</h3>
          <a href="${withBase("/catalogo/")}" data-route="/catalogo">Productos</a>
          <a href="${withBase("/nosotros/")}">Nosotros</a>
          <a href="${withBase("/contacto/")}">Contacto</a>
        </nav>
        <nav class="footer-column" aria-label="Legal">
          <h3>Legal</h3>
          <a href="${withBase("/politicas/")}">Politicas</a>
          <a href="${withBase("/devoluciones/")}">Devoluciones</a>
          <a href="${withBase("/privacidad/")}">Privacidad</a>
        </nav>
      </div>
      <div class="site-footer__bottom">
        <span>Luna Creativa Colombia Copyright <span data-current-year></span></span>
      </div>
    </footer>
  `;
}
