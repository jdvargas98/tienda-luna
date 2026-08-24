import { cartQuantity } from "./cart.js?v=20260823-product-route";
import { BASE_PATH, withBase } from "./config.js?v=20260823-product-route";

export function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function loadShell() {
  await Promise.all([
    injectPartial("#siteHeader", withBase("/components/header.html?v=20260824-lucide-categories")),
    injectPartial("#siteFooter", withBase("/components/footer.html?v=20260824-lucide-categories")),
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
        <nav class="nav-shell" aria-label="Navegacion principal">
          <a class="brand" href="${withBase("/")}" data-route="/">
            <img src="${withBase("/assets/img/logo/luna-creativa.png")}" alt="Logo Luna Creativa" width="42" height="42">
            <span>Luna Creativa</span>
          </a>
          <form class="site-search" id="siteSearch" role="search">
            <input id="siteSearchInput" type="search" autocomplete="off" placeholder="Buscar productos personalizados...">
            <button type="submit" aria-label="Buscar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
            </button>
            <div class="site-search__suggestions" id="siteSearchSuggestions" aria-live="polite"></div>
          </form>
          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteMenu">Menu</button>
          <div class="nav-links" id="siteMenu">
            <a href="${withBase("/")}" data-route="/">Inicio</a>
            <a href="${withBase("/servicios/")}" data-route="/servicios">Servicios</a>
            <a href="${withBase("/catalogo/")}" data-route="/catalogo">Productos</a>
            <a href="${withBase("/visita/")}" data-route="/visita">Agendar visita</a>
            <a href="${withBase("/seguimiento/")}" data-route="/seguimiento">Seguimiento</a>
            <a class="cart-link" href="${withBase("/carrito/")}" data-route="/carrito">Carrito <span id="cartBadge">0</span></a>
          </div>
        </nav>
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
          <p>Publicidad, impresión y soluciones personalizadas para hacer visible tu negocio.</p>
        </div>
        <nav class="footer-column" aria-label="Pedidos">
          <h3>Pedidos</h3>
          <a href="${withBase("/carrito/")}" data-route="/carrito">Carrito</a>
          <a href="${withBase("/checkout/")}" data-route="/checkout">Checkout</a>
          <a href="${withBase("/seguimiento/")}" data-route="/seguimiento">Rastreo</a>
        </nav>
        <nav class="footer-column" aria-label="Empresas">
          <h3>Empresas</h3>
          <a href="${withBase("/servicios/")}" data-route="/servicios">Servicios</a>
          <a href="${withBase("/catalogo/")}" data-route="/catalogo">Productos</a>
          <a href="${withBase("/visita/")}" data-route="/visita">Agendar visita</a>
          <a href="mailto:ventas@lunacreativa.com.co">Correo a Ventas</a>
        </nav>
        <nav class="footer-column" aria-label="Legal">
          <h3>Legal</h3>
          <a href="https://lunacreativa.com.co/legal/politica-privacidad.html" target="_blank" rel="noreferrer">Política de privacidad</a>
        </nav>
      </div>
      <div class="site-footer__bottom">
        <span>Luna Creativa Colombia Copyright <span data-current-year></span></span>
      </div>
    </footer>
    <a class="contact-float" href="https://wa.me/573114512495?text=Hola%20Luna%20Creativa%2C%20quiero%20cotizar%20un%20proyecto." target="_blank" rel="noreferrer" aria-label="Hablar con Luna Creativa por WhatsApp">
      <span class="contact-float__prompt">Hablemos ahora</span>
      <span class="contact-float__button">
        <img src="${withBase("/assets/img/icons/whatsapp.png")}" alt="" width="56" height="56" aria-hidden="true">
        <span class="contact-float__status" aria-hidden="true"></span>
      </span>
    </a>
  `;
}
