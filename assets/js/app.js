import {
  fetchCatalog,
  fetchColombiaCities,
  fetchColombiaDepartments,
  fetchOrderTracking,
  fetchProductDetail,
  requestVisit,
  uploadPersonalizationFile,
} from "./data.js?v=20260823-product-route";
import { BASE_PATH, withBase } from "./config.js?v=20260823-product-route";
import {
  addConfiguredProductToCart,
  cartQuantity,
  cartSubtotal,
  createOrder,
  hydrateProductState,
  removeCartItem,
  saveState,
  setVariant,
  state,
  updatePersonalizationValue,
  updatePhotoUrl,
  updateQuantity,
} from "./cart.js?v=20260823-product-route";
import { loadShell, money, setActiveRoute, updateCartBadge } from "./ui.js?v=20260823-product-route";

const routes = {
  "/": renderHome,
  "/catalogo": renderCatalog,
  "/producto": renderProduct,
  "/carrito": renderCart,
  "/checkout": renderCheckout,
  "/confirmacion": renderConfirmation,
  "/seguimiento": renderTracking,
  "/visita": renderVisit,
};

const app = document.querySelector("#app");
const storefront = {
  catalog: null,
  product: null,
  productSlug: "",
};

document.addEventListener("click", (event) => {
  const routeLink = event.target.closest("[data-route]");
  if (!routeLink) return;
  if (routeLink.getAttribute("aria-disabled") === "true") {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  const href = routeLink.getAttribute("href") || routeLink.dataset.route;
  const route = href.replace(/^\/tienda/, "") || routeLink.dataset.route;
  navigate(route);
});

window.addEventListener("popstate", () => void renderRoute());

loadShell().then(() => {
  bindSiteSearch();
  void renderRoute();
});

function normalizePath() {
  const path = window.location.pathname.replace(/\/$/, "");
  const withoutBase = BASE_PATH ? path.replace(/^\/tienda/, "") || "/" : path || "/";
  return routes[withoutBase] ? withoutBase : "/";
}

function navigate(route) {
  const [routePath, query = ""] = route.split("?");
  const cleanRoute = routePath === "/" ? "/" : routePath.replace(/\/$/, "");
  const basePath = cleanRoute === "/" ? withBase("/") : withBase(`${cleanRoute}/`);
  const nextUrl = `${basePath}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", nextUrl);
  closeMenu();
  void renderRoute();
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function renderRoute() {
  const path = normalizePath();
  updateCartBadge();
  setActiveRoute(path);
  try {
    await routes[path]();
  } catch (error) {
    console.error("[tienda] Error cargando ruta:", error);
    renderStoreError(error);
  }
}

function closeMenu() {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector("#siteMenu");
  navLinks?.classList.remove("open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function bindSiteSearch() {
  const form = document.querySelector("#siteSearch");
  const input = document.querySelector("#siteSearchInput");
  const suggestions = document.querySelector("#siteSearchSuggestions");
  if (!form || !input || !suggestions) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    suggestions.classList.remove("open");
    navigate(`/catalogo/?q=${encodeURIComponent(query)}`);
  });

  input.addEventListener("input", async () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestions.classList.remove("open");
      suggestions.innerHTML = "";
      return;
    }

    const catalog = await ensureCatalog();
    const matches = filterProductsBySearch(catalog.productos || [], query).slice(0, 5);
    suggestions.innerHTML = matches.length
      ? matches.map((product) => searchSuggestionMarkup(product)).join("")
      : `<div class="site-search__empty">No encontramos productos para "${escapeHtml(query)}"</div>`;
    suggestions.classList.add("open");
  });

  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) suggestions.classList.remove("open");
  });
}

async function renderHome() {
  const catalog = await ensureCatalog();
  app.innerHTML = `
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-hero__inner">
        <div class="home-hero__content">
          <p class="home-eyebrow">Publicidad · impresión · marca</p>
          <h1 id="home-title">Publicidad que hace <em>visible</em> tu negocio.</h1>
          <p class="home-hero__desc">Diseñamos y producimos avisos 2D y 3D, impresión, corte láser, branding y personalizados para que tu marca se vea profesional en cada punto de contacto.</p>
          <div class="home-hero__actions">
            <a class="btn primary" href="mailto:info@lunacreativa.com.co?subject=Quiero%20cotizar%20un%20proyecto%20de%20publicidad">Solicitar asesoría</a>
            <a class="btn btn--outline-white" href="${withBase("/catalogo/")}" data-route="/catalogo">Explorar catálogo</a>
          </div>
          <div class="home-trust-row">
            <div class="home-trust-stat">
              <strong>Asesoría</strong>
              <span>para aterrizar tu idea</span>
            </div>
            <div class="home-trust-sep" aria-hidden="true"></div>
            <div class="home-trust-stat">
              <strong>Diseño</strong>
              <span>alineado con tu marca</span>
            </div>
            <div class="home-trust-sep" aria-hidden="true"></div>
            <div class="home-trust-stat">
              <strong>Producción</strong>
              <span>lista para implementar</span>
            </div>
          </div>
        </div>
        <div class="home-hero__showcase" aria-label="Servicios de publicidad">
          <div class="home-showcase__header">
            <span>Soluciones integrales</span>
            <strong>Tu marca, bien presentada</strong>
          </div>
          <div class="home-showcase__grid">
            <span>Avisos 2D y 3D</span>
            <span>Impresión</span>
            <span>Corte láser</span>
            <span>Branding</span>
            <span>Personalizados</span>
            <span>Eventos</span>
          </div>
          <p>De la idea a la producción y entrega.</p>
        </div>
      </div>
    </section>

    <section class="section home-services" aria-labelledby="services-title">
      <div class="home-section-heading">
        <div>
          <p class="section-kicker">Lo que hacemos</p>
          <h2 id="services-title">Soluciones para que tu marca se vea.</h2>
        </div>
        <p>Desde una pieza puntual hasta la imagen completa de un espacio, construimos cada proyecto según lo que necesitas comunicar.</p>
      </div>
      <div class="home-services__grid">
        <article class="home-service-card">
          <span class="home-service-card__mark">3D</span>
          <h3>Avisos 2D y 3D</h3>
          <p>Letreros y elementos de fachada pensados para identificar y destacar tu negocio.</p>
        </article>
        <article class="home-service-card">
          <span class="home-service-card__mark">CL</span>
          <h3>Corte láser</h3>
          <p>Piezas precisas para señalización, decoración, exhibición y proyectos personalizados.</p>
        </article>
        <article class="home-service-card">
          <span class="home-service-card__mark">IMP</span>
          <h3>Impresión</h3>
          <p>Material gráfico para comunicar promociones, información y presencia de marca.</p>
        </article>
        <article class="home-service-card">
          <span class="home-service-card__mark">BR</span>
          <h3>Branding</h3>
          <p>Aplicaciones visuales coherentes para presentar tu marca de forma profesional.</p>
        </article>
        <article class="home-service-card">
          <span class="home-service-card__mark">P</span>
          <h3>Personalizados</h3>
          <p>Productos y detalles producidos a la medida de tu marca, ocasión o campaña.</p>
        </article>
        <article class="home-service-card">
          <span class="home-service-card__mark">EV</span>
          <h3>Publicidad para eventos</h3>
          <p>Piezas visuales que ayudan a identificar, ambientar y comunicar tu evento.</p>
        </article>
      </div>
    </section>

    <div class="home-needs-wrap">
      <section class="section home-needs" aria-labelledby="needs-title">
        <div class="home-section-heading home-section-heading--light">
          <div>
            <p class="section-kicker kicker--light">Soluciones por necesidad</p>
            <h2 id="needs-title">¿Qué quieres lograr?</h2>
          </div>
          <p>Cuéntanos el objetivo. Nosotros te ayudamos a definir las piezas, materiales y producción.</p>
        </div>
        <div class="home-needs__grid">
          <article><span>01</span><h3>Abrir un negocio</h3><p>Identidad visible, aviso y piezas esenciales para empezar con una imagen clara.</p></article>
          <article><span>02</span><h3>Renovar tu imagen</h3><p>Actualización de fachada, señalización y aplicaciones para verte más vigente.</p></article>
          <article><span>03</span><h3>Preparar un evento</h3><p>Elementos gráficos y personalizados para una experiencia visual consistente.</p></article>
          <article><span>04</span><h3>Lanzar una campaña</h3><p>Piezas impresas y visuales alineadas con una promoción o temporada comercial.</p></article>
        </div>
      </section>
    </div>

    <section class="section home-portfolio" aria-labelledby="portfolio-title">
      <div class="home-section-heading">
        <div>
          <p class="section-kicker">Portafolio</p>
          <h2 id="portfolio-title">Proyectos que podemos desarrollar.</h2>
        </div>
        <p>Estas composiciones son muestras conceptuales. Las sustituiremos progresivamente por fotografías de trabajos reales autorizados.</p>
      </div>
      <div class="home-portfolio__notice">Muestras conceptuales · No corresponden a clientes ni proyectos entregados</div>
      <div class="home-portfolio__grid">
        <article class="home-project-card">
          <div class="home-project-art home-project-art--facade" role="img" aria-label="Representación conceptual de un aviso tridimensional">
            <span class="project-building"></span><strong>LUNA</strong>
          </div>
          <div class="home-project-copy"><span>Avisos 2D y 3D</span><h3>Fachada con presencia</h3><p>Identificación exterior clara y visible.</p></div>
        </article>
        <article class="home-project-card">
          <div class="home-project-art home-project-art--laser" role="img" aria-label="Representación conceptual de señalización cortada en láser">
            <span>ENTRADA</span><i></i><span>RECEPCIÓN</span>
          </div>
          <div class="home-project-copy"><span>Corte láser</span><h3>Señalización interior</h3><p>Piezas precisas para orientar y ambientar.</p></div>
        </article>
        <article class="home-project-card">
          <div class="home-project-art home-project-art--print" role="img" aria-label="Representación conceptual de piezas impresas para campaña">
            <i></i><i></i><i></i>
          </div>
          <div class="home-project-copy"><span>Impresión</span><h3>Campaña comercial</h3><p>Una misma idea aplicada en diferentes formatos.</p></div>
        </article>
        <article class="home-project-card">
          <div class="home-project-art home-project-art--event" role="img" aria-label="Representación conceptual de elementos personalizados para eventos">
            <span>MARCA</span><i></i><b>EVENTO</b>
          </div>
          <div class="home-project-copy"><span>Eventos y personalizados</span><h3>Experiencia de marca</h3><p>Elementos coordinados para una presentación memorable.</p></div>
        </article>
      </div>
    </section>

    <div class="home-process-wrap">
      <section class="section home-process" aria-labelledby="process-title">
        <div class="home-section-heading">
          <div>
            <p class="section-kicker">Cómo trabajamos</p>
            <h2 id="process-title">De la idea al resultado.</h2>
          </div>
          <p>Un proceso claro para entender, diseñar y producir la solución adecuada.</p>
        </div>
        <ol class="home-process__steps">
          <li><span>01</span><div><h3>Asesoría</h3><p>Entendemos tu necesidad, espacio, cantidad y objetivo.</p></div></li>
          <li><span>02</span><div><h3>Diseño</h3><p>Definimos la propuesta visual, medidas y acabados.</p></div></li>
          <li><span>03</span><div><h3>Producción</h3><p>Fabricamos las piezas aprobadas para tu proyecto.</p></div></li>
          <li><span>04</span><div><h3>Instalación o entrega</h3><p>Coordinamos la etapa final según el producto y destino.</p></div></li>
        </ol>
      </section>
    </div>

    <section class="section home-coverage" aria-labelledby="coverage-title">
      <div class="home-coverage__panel">
        <div>
          <p class="section-kicker kicker--light">Atención regional</p>
          <h2 id="coverage-title">Cuéntanos dónde está tu proyecto.</h2>
          <p>Confirmamos cobertura, visita técnica, forma de entrega y tiempos antes de iniciar la producción.</p>
        </div>
        <div class="home-coverage__details" aria-label="Condiciones de cobertura">
          <span>Visita técnica por confirmar</span>
          <span>Envíos según destino</span>
          <span>Tiempos definidos en la cotización</span>
        </div>
        <a class="btn btn--cta-primary" href="mailto:info@lunacreativa.com.co?subject=Quiero%20consultar%20cobertura%20para%20mi%20proyecto">Consultar cobertura</a>
      </div>
    </section>

    <div class="home-catalog-wrap">
      ${categoryBar()}
      <section class="section home-catalog">
        <div class="section-head">
          <div>
            <p class="section-kicker">Catálogo</p>
            <h2>Productos para complementar tu proyecto.</h2>
            <p>Explora los productos disponibles y sus opciones de personalización.</p>
          </div>
          <a class="view-all" href="${withBase("/catalogo/")}" data-route="/catalogo">Ver catálogo →</a>
        </div>
        <div class="catalog-grid" aria-label="Productos destacados">
          ${catalog.productos.map(productCard).join("")}
        </div>
      </section>
    </div>

    <div class="home-cta-outer">
      <div class="home-cta-banner">
        <div class="home-cta-banner__blobs" aria-hidden="true"><span></span><span></span></div>
        <div class="home-cta-banner__content">
          <p class="section-kicker kicker--light">Hablemos de tu idea</p>
          <h2>¿Tienes un proyecto en mente?</h2>
          <p>Descríbenos qué necesitas y te ayudaremos a definir el siguiente paso.</p>
          <div class="home-cta-banner__actions">
            <a class="btn btn--cta-primary" href="mailto:info@lunacreativa.com.co?subject=Quiero%20cotizar%20un%20proyecto">Solicitar asesoría</a>
            <a class="btn btn--cta-ghost" href="${withBase("/catalogo/")}" data-route="/catalogo">Explorar catálogo</a>
          </div>
        </div>
      </div>
    </div>
  `;
  initHeroMotion();
}

function initHeroMotion() {
  const hero = document.querySelector(".home-hero");
  const showcase = hero?.querySelector(".home-hero__showcase");
  if (!hero || !showcase || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let frame = 0;

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      showcase.style.setProperty("--hero-shift-x", `${(x * 5).toFixed(2)}px`);
      showcase.style.setProperty("--hero-shift-y", `${(y * 4).toFixed(2)}px`);
      showcase.style.setProperty("--hero-tilt", `${(x * 0.35).toFixed(2)}deg`);
    });
  });

  hero.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    showcase.style.removeProperty("--hero-shift-x");
    showcase.style.removeProperty("--hero-shift-y");
    showcase.style.removeProperty("--hero-tilt");
  });
}

async function renderVisit() {
  const today = new Date();
  const minimumDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const maximumDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

  app.innerHTML = `
    <section class="visit-hero" aria-labelledby="visit-title">
      <div class="visit-hero__inner">
        <p class="section-kicker">Visita de cotización</p>
        <h1 id="visit-title">Agenda una visita para revisar tu proyecto.</h1>
        <p>Propón una fecha y hora para que el equipo de Ventas pueda revisar el espacio, las medidas y las necesidades de tu negocio.</p>
      </div>
    </section>

    <section class="section visit-layout">
      <div class="visit-form-card">
        <div class="visit-form-card__head">
          <p class="section-kicker">Tus datos</p>
          <h2>Solicitar fecha de visita</h2>
          <p>Los campos marcados con * son obligatorios.</p>
        </div>
        <form class="visit-form" id="visitForm">
          <label>
            <span>Nombre completo *</span>
            <input name="name" type="text" autocomplete="name" maxlength="120" required>
          </label>
          <label>
            <span>Empresa o marca</span>
            <input name="company" type="text" autocomplete="organization" maxlength="140">
          </label>
          <label>
            <span>Correo electrónico *</span>
            <input name="email" type="email" autocomplete="email" maxlength="190" required>
          </label>
          <label>
            <span>Celular o WhatsApp *</span>
            <input name="phone" type="tel" autocomplete="tel" inputmode="tel" minlength="7" maxlength="30" required>
          </label>
          <label>
            <span>Ciudad *</span>
            <input name="city" type="text" autocomplete="address-level2" maxlength="100" value="Neiva" required>
          </label>
          <label>
            <span>Dirección de la visita *</span>
            <input name="address" type="text" autocomplete="street-address" maxlength="220" required>
          </label>
          <label>
            <span>Fecha propuesta *</span>
            <input name="date" type="date" min="${formatInputDate(minimumDate)}" max="${formatInputDate(maximumDate)}" required>
            <small>Disponible para solicitar desde mañana y hasta 90 días.</small>
          </label>
          <label>
            <span>Hora propuesta *</span>
            <select name="time" required>
              <option value="">Selecciona un horario</option>
              ${visitTimeOptions()}
            </select>
            <small>Horarios disponibles para solicitar: 7:00 a. m. a 7:00 p. m.</small>
          </label>
          <label class="visit-form__wide">
            <span>Servicio de interés *</span>
            <select name="service" required>
              <option value="">Selecciona una opción</option>
              <option value="Avisos 2D y 3D">Avisos 2D y 3D</option>
              <option value="Corte láser">Corte láser</option>
              <option value="Impresión">Impresión</option>
              <option value="Branding">Branding</option>
              <option value="Personalizados">Personalizados</option>
              <option value="Publicidad para eventos">Publicidad para eventos</option>
              <option value="Otro proyecto">Otro proyecto</option>
            </select>
          </label>
          <label class="visit-form__wide">
            <span>¿Qué necesitas revisar durante la visita? *</span>
            <textarea name="message" rows="5" minlength="10" maxlength="2000" placeholder="Describe el espacio, medidas aproximadas, tipo de aviso o necesidad principal." required></textarea>
          </label>
          <label class="visit-form__trap" hidden>
            <span>Sitio web</span>
            <input name="website" type="text" tabindex="-1" autocomplete="off">
          </label>
          <div class="visit-conditions visit-form__wide">
            <div class="visit-conditions__warning" role="note">
              <span class="visit-conditions__icon" aria-hidden="true">!</span>
              <p><strong>Importante:</strong> la fecha y hora seleccionadas son una solicitud. Nuestro equipo de Ventas se pondrá en contacto contigo para confirmar la disponibilidad y dejar la visita agendada.</p>
            </div>
            <label>
              <input name="change_acknowledged" type="checkbox" value="yes" required>
              <span>Entiendo que cualquier cambio de fecha u hora debe solicitarse y confirmarse nuevamente.</span>
            </label>
            <label>
              <input name="privacy_accepted" type="checkbox" value="yes" required>
              <span>Autorizo el tratamiento de mis datos para gestionar esta solicitud según la <a href="https://lunacreativa.com.co/legal/politica-privacidad.html" target="_blank" rel="noreferrer">Política de Privacidad</a>.</span>
            </label>
          </div>
          <div class="visit-form__footer visit-form__wide">
            <p class="visit-form__status" id="visitStatus" role="status" aria-live="polite" hidden></p>
            <button class="btn primary" type="submit">Revisar y confirmar</button>
          </div>
        </form>
      </div>

      <aside class="visit-aside">
        <p class="section-kicker">Cómo funciona</p>
        <ol>
          <li><span>1</span><div><strong>Envías tu solicitud</strong><p>Seleccionas una fecha y hora preferidas.</p></div></li>
          <li><span>2</span><div><strong>Ventas revisa la agenda</strong><p>El equipo valida disponibilidad y cobertura.</p></div></li>
          <li><span>3</span><div><strong>Recibes confirmación</strong><p>La visita queda agendada solamente después de la respuesta de Ventas.</p></div></li>
        </ol>
        <div class="visit-aside__contact">
          <span>También puedes escribir a</span>
          <a href="mailto:ventas@lunacreativa.com.co">ventas@lunacreativa.com.co</a>
        </div>
      </aside>
    </section>

    <dialog class="visit-confirm" id="visitConfirm" aria-labelledby="visit-confirm-title">
      <div class="visit-confirm__content">
        <p class="section-kicker">Segunda confirmación</p>
        <h2 id="visit-confirm-title">Revisa tu solicitud</h2>
        <dl>
          <div><dt>Fecha y hora</dt><dd id="visitConfirmDate"></dd></div>
          <div><dt>Dirección</dt><dd id="visitConfirmAddress"></dd></div>
          <div><dt>Servicio</dt><dd id="visitConfirmService"></dd></div>
        </dl>
        <div class="visit-confirm__warning">
          Este horario está pendiente de confirmación. Nuestro equipo de Ventas se pondrá en contacto contigo para confirmar la disponibilidad.
        </div>
        <div class="visit-confirm__actions">
          <button class="btn ghost" id="visitEdit" type="button">Volver y editar</button>
          <button class="btn primary" id="visitSend" type="button">Confirmar y enviar</button>
        </div>
      </div>
    </dialog>
  `;

  bindVisitForm();
}

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function visitTimeOptions() {
  const options = [];
  for (let minutes = 7 * 60; minutes <= 19 * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const period = hour >= 12 ? "p. m." : "a. m.";
    const displayHour = hour % 12 || 12;
    options.push(`<option value="${value}">${displayHour}:${String(minute).padStart(2, "0")} ${period}</option>`);
  }
  return options.join("");
}

function bindVisitForm() {
  const form = document.querySelector("#visitForm");
  const dialog = document.querySelector("#visitConfirm");
  const status = document.querySelector("#visitStatus");
  const sendButton = document.querySelector("#visitSend");
  const editButton = document.querySelector("#visitEdit");
  if (!form || !dialog || !status || !sendButton || !editButton) return;

  let pendingPayload = null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    pendingPayload = {
      name: data.get("name"),
      company: data.get("company"),
      email: data.get("email"),
      phone: data.get("phone"),
      city: data.get("city"),
      address: data.get("address"),
      date: data.get("date"),
      time: data.get("time"),
      service: data.get("service"),
      message: data.get("message"),
      website: data.get("website"),
      privacy_accepted: data.get("privacy_accepted") === "yes",
      change_acknowledged: data.get("change_acknowledged") === "yes",
    };

    const requestedDate = new Date(`${pendingPayload.date}T${pendingPayload.time}:00`);
    document.querySelector("#visitConfirmDate").textContent = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(requestedDate);
    document.querySelector("#visitConfirmAddress").textContent = `${pendingPayload.address}, ${pendingPayload.city}`;
    document.querySelector("#visitConfirmService").textContent = pendingPayload.service;
    status.hidden = true;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  editButton.addEventListener("click", () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  });

  sendButton.addEventListener("click", async () => {
    if (!pendingPayload) return;
    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";

    try {
      const result = await requestVisit(pendingPayload);
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      form.reset();
      form.elements.city.value = "Neiva";
      status.textContent = result.message;
      status.className = "visit-form__status visit-form__status--success";
      status.hidden = false;
      status.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingPayload = null;
    } catch (error) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      status.textContent = error.message || "No pudimos enviar la solicitud.";
      status.className = "visit-form__status visit-form__status--error";
      status.hidden = false;
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Confirmar y enviar";
    }
  });
}

async function renderCatalog() {
  const catalog = await ensureCatalog();
  const activeCategory = activeCategorySlug();
  const searchQuery = activeSearchQuery();
  const products = filterProductsBySearch(filterProductsByCategory(catalog.productos || [], activeCategory), searchQuery);
  const selectedCategory = (catalog.categorias || []).find((category) => category.slug === activeCategory);
  app.innerHTML = `
    ${categoryBar()}
    <section class="section page-head">
      <h1>${searchQuery ? `Resultados para "${escapeHtml(searchQuery)}"` : selectedCategory ? selectedCategory.nombre : "Productos personalizados"}</h1>
      <p>${searchQuery ? `${products.length} resultado${products.length === 1 ? "" : "s"} disponible${products.length === 1 ? "" : "s"}.` : selectedCategory ? `${products.length} producto${products.length === 1 ? "" : "s"} publicado${products.length === 1 ? "" : "s"} en esta categoria.` : "Elige una referencia, revisa variantes y prepara la personalizacion del pedido."}</p>
    </section>
    <section class="section catalog-grid" aria-label="Listado de productos">
      ${products.length ? products.map(productCard).join("") : emptyCatalogMarkup(selectedCategory)}
    </section>
  `;
}

function productCard(product) {
  const price = Number(product.precio_base || 0);
  const compare = Number(product.precio_comparacion || 0);
  const compareMarkup = compare > price ? `<del>${money(compare)}</del>` : "";
  const img = productImage(product);
  const tag = product.destacado ? "DESTACADO" : product.permite_personalizacion ? "PERSONALIZABLE" : "PUBLICADO";
  const detailPath = productDetailPath(product);
  return `
    <article class="product-card">
      <a class="product-card__image" href="${withBase(detailPath)}" data-route="/producto">
        <div class="tag-row">
          <span class="pill">${tag}</span>
          <span class="favorite" aria-hidden="true">♡</span>
        </div>
        ${img ? `<img src="${img}" alt="${product.nombre}">` : placeholderMedia(product.nombre)}
      </a>
      <div class="product-card__body">
        <h3>${product.nombre}</h3>
        <div class="rating"><span class="stars">★★★★★</span> Catalogo conectado</div>
        <p class="price">Desde ${compareMarkup} <span class="sale-price">${money(price)}</span></p>
        <p class="muted">${product.descripcion_corta || product.categoria?.nombre || "Producto publicado"}</p>
        <a class="btn primary full-width product-cta" href="${withBase(detailPath)}" data-route="/producto">${product.permite_personalizacion ? "Personalizar" : "Ver detalle"}</a>
      </div>
    </article>
  `;
}

function categoryBar() {
  const categories = storefront.catalog?.categorias || [];
  const activeCategory = activeCategorySlug();
  return `
    <nav class="category-bar" aria-label="Categorias de tienda">
      <div class="category-bar__inner">
        ${categoryItem("Todos", "/catalogo/", giftIcon(), !activeCategory)}
        ${
          categories.length
            ? categories
                .map((category, index) =>
                  categoryItem(category.nombre, `/catalogo/?categoria=${encodeURIComponent(category.slug)}`, iconByIndex(index), category.slug === activeCategory)
                )
                .join("")
            : ""
        }
      </div>
    </nav>
  `;
}

function categoryItem(label, path, icon, active = false) {
  return `
    <a class="category-item ${active ? "active" : ""}" href="${withBase(path)}" data-route="${path.replace(/\/$/, "") || "/"}">
      <span class="category-icon" aria-hidden="true">${icon}</span>
      <span>${escapeHtml(label)}</span>
    </a>
  `;
}

function emptyCatalogMarkup(category) {
  return `
    <div class="empty-state catalog-empty">
      <h3>No hay productos publicados${category ? ` en ${escapeHtml(category.nombre)}` : ""}.</h3>
      <p>Cuando el cotizador publique referencias para esta categoria, apareceran automaticamente aqui.</p>
      <a class="btn secondary" href="${withBase("/catalogo/")}" data-route="/catalogo">Ver todo el catalogo</a>
    </div>
  `;
}

function swatchesMarkup(colors) {
  return `
    <div class="swatches" aria-label="Variantes">
      ${colors.map((color) => `<span class="swatch ${swatchClass(color)}"></span>`).join("")}
      <span class="muted">+${Math.max(colors.length, 3)}</span>
    </div>
  `;
}

function swatchClass(color) {
  const colorMap = {
    "#111111": "swatch-black",
    "#ffffff": "swatch-white",
    "#e6007e": "swatch-pink",
    "#6b33ff": "swatch-violet",
    "#66c9e8": "swatch-blue",
    "#b98558": "swatch-wood",
  };
  return colorMap[color] || "swatch-neutral";
}

function puzzleIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M9 3h5v4h2a2 2 0 1 1 0 4h-2v3h-3v2a2 2 0 1 1-4 0v-2H3V9h4V7a2 2 0 1 1 4 0v2h3V6H9z"></path></svg>`;
}

function mugIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M5 6h11v7a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4z"></path><path d="M16 8h2a3 3 0 0 1 0 6h-2"></path><path d="M6 3h10"></path></svg>`;
}

function laserIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M5 19h14"></path><path d="M8 19V8"></path><path d="M8 8l5-3 3 3"></path><path d="M16 8l3-2"></path><path d="M16 8l3 2"></path><path d="M12 12l-2 7"></path></svg>`;
}

function penIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11a2.2 2.2 0 0 0-3-3L5 16z"></path><path d="M14 6l4 4"></path></svg>`;
}

function homeIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"></path><path d="M6 10v10h12V10"></path><path d="M10 20v-6h4v6"></path></svg>`;
}

function giftIcon() {
  return `<svg viewBox="0 0 24 24"><path d="M4 10h16v10H4z"></path><path d="M4 10V7h16v3"></path><path d="M12 7v13"></path><path d="M8 7a2 2 0 1 1 4 0"></path><path d="M16 7a2 2 0 1 0-4 0"></path></svg>`;
}

async function renderProduct() {
  const product = await ensurePrimaryProduct();
  hydrateProductState(product);

  const pricingField = primaryPricingField(product);
  const variants = product.variantes || [];
  const basePrice = Number(pricingField?.valores?.[0]?.precio || variants[0]?.precio || product.precio_base || 0);
  const selectedPrice = currentProductPrice(product);
  const hasPhoto = !!state.personalization.photoUrl;
  const previewPhotoUrl = resolveMediaUrl(state.personalization.photoUrl || "");
  const images = productImages(product);
  const mainImage = images[0] || "";
  const personalizationFields = product.personalizaciones || [];

  app.innerHTML = `
    <section class="pdp-layout">
      <div class="pdp-left">
        <div class="pdp-gallery">
          <div class="pdp-gallery__main">
            ${mainImage ? `<img id="galleryImage" src="${mainImage}" alt="${product.nombre}">` : placeholderMedia(product.nombre)}
          </div>
          <div class="pdp-gallery__thumbs" aria-label="Galeria del producto">
            ${images
              .map(
                (img, i) => `
              <button class="pdp-thumb ${i === 0 ? "active" : ""}" type="button" data-gallery="${img}" aria-label="Vista ${i + 1}">
                <img src="${img}" alt="Vista ${i + 1} de ${product.nombre}">
              </button>`
              )
              .join("")}
          </div>
        </div>

        <div class="pdp-photo-preview" aria-live="polite">
          <div class="pdp-photo-frame">
            <img id="previewPhoto" class="${hasPhoto ? "" : "is-hidden"}" src="${previewPhotoUrl}" alt="Preview de tu foto">
            <div id="previewEmpty" class="pdp-photo-empty ${hasPhoto ? "is-hidden" : ""}">
              ${cameraIcon()}
              <span>Tu foto aparecera aqui</span>
            </div>
            <div class="pdp-puzzle-overlay" aria-hidden="true"></div>
          </div>
        </div>

        <div class="pdp-info-card">
          <h3>Curated Artistry</h3>
          <p>${product.descripcion_larga || product.descripcion_corta || ""}</p>
          <div class="pdp-features">
            <span class="pdp-feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9V7a5 5 0 0 1 10 0v2"/><rect x="2" y="9" width="20" height="13" rx="2"/><circle cx="12" cy="16" r="1"/></svg>
              MDF Sustentable
            </span>
            <span class="pdp-feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Corte laser de alta precision
            </span>
          </div>
        </div>
      </div>

      <aside class="pdp-panel sticky-panel">
        <p class="pdp-edition-badge">Edicion Premium</p>
        <h1>${product.nombre}</h1>
        <div class="pdp-price-row">
          <span class="pdp-price">${money(selectedPrice)}</span>
          <span class="pdp-avail-badge">Disponible</span>
        </div>

        <div class="pdp-section">
          <p class="pdp-section-label">
            <span class="pdp-step-num" aria-hidden="true">1</span>
            ${pricingField?.label || "Selecciona el tamano"}
          </p>
          <div class="pdp-variants">
            ${
              pricingField
                ? pricingField.valores.map((option) => pricingOptionCard(pricingField, option, basePrice)).join("")
                : variants.map((v) => variantCard(v, basePrice)).join("")
            }
          </div>
        </div>

        <div class="pdp-section">
          <p class="pdp-section-label">
            <span class="pdp-step-num" aria-hidden="true">2</span>
            Personalizacion
          </p>
          ${renderPersonalizationFields(personalizationFields)}
        </div>

        <button class="btn primary full-width pdp-cta" type="button" id="addToCart">
          Agregar al carrito &mdash; ${money(selectedPrice)}
        </button>
      </aside>
    </section>
  `;
  bindProductEvents(product);
}

function variantCard(variant, basePrice) {
  const currentPrice = Number(variant.precio || 0);
  const isActive = String(variant.id) === String(state.selectedVariant?.id);
  const delta = currentPrice - basePrice;
  return `
    <button class="pdp-variant ${isActive ? "active" : ""}" type="button" data-variant="${variant.id}">
      <div class="pdp-variant__left">
        <div class="pdp-variant__icon" aria-hidden="true">${puzzleGridIcon(variant.id)}</div>
        <div class="pdp-variant__info">
          <strong>${variant.nombre}</strong>
          <span>${variant.sku || "Variante disponible"}${variantSubtitle(variant.nombre) ? ` &middot; ${variantSubtitle(variant.nombre)}` : ""}</span>
        </div>
      </div>
      <div class="pdp-variant__right">
        ${delta > 0 ? `<span class="pdp-variant__delta">+${money(delta)}</span>` : ""}
        ${isActive ? `<span class="pdp-check" aria-hidden="true">&#10003;</span>` : ""}
      </div>
    </button>
  `;
}

function pricingOptionCard(field, option, basePrice) {
  const currentValue = String(state.personalization.values[field.codigo] || field.valores?.[0]?.valor || "");
  const isActive = String(option.valor) === currentValue;
  const currentPrice = Number(option.precio || 0);
  const delta = currentPrice - basePrice;
  return `
    <button class="pdp-variant ${isActive ? "active" : ""}" type="button" data-price-code="${field.codigo}" data-price-value="${escapeHtml(String(option.valor))}">
      <div class="pdp-variant__left">
        <div class="pdp-variant__icon" aria-hidden="true">${puzzleGridIcon(option.label)}</div>
        <div class="pdp-variant__info">
          <strong>${option.label}</strong>
          <span>${field.label}</span>
        </div>
      </div>
      <div class="pdp-variant__right">
        <span class="pdp-variant__delta">${money(currentPrice)}</span>
        ${delta > 0 ? `<small>+${money(delta)}</small>` : ""}
        ${isActive ? `<span class="pdp-check" aria-hidden="true">&#10003;</span>` : ""}
      </div>
    </button>
  `;
}

function variantSubtitle(name = "") {
  const text = String(name).toLowerCase();
  if (text.includes("64")) return "Formato inicial";
  if (text.includes("120")) return "Formato medio";
  if (text.includes("500")) return "Diseno intermedio";
  if (text.includes("1000")) return "Edicion completa";
  return "";
}

function puzzleGridIcon(variantId) {
  const grids = {
    "64": `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="11" y="3" width="6" height="6" rx="1.2"/>
      <rect x="3" y="11" width="6" height="6" rx="1.2"/><rect x="11" y="11" width="6" height="6" rx="1.2"/>
    </svg>`,
    "500": `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="4.5" height="4.5" rx="0.8"/><rect x="7.75" y="2" width="4.5" height="4.5" rx="0.8"/><rect x="13.5" y="2" width="4.5" height="4.5" rx="0.8"/>
      <rect x="2" y="7.75" width="4.5" height="4.5" rx="0.8"/><rect x="7.75" y="7.75" width="4.5" height="4.5" rx="0.8"/><rect x="13.5" y="7.75" width="4.5" height="4.5" rx="0.8"/>
      <rect x="2" y="13.5" width="4.5" height="4.5" rx="0.8"/><rect x="7.75" y="13.5" width="4.5" height="4.5" rx="0.8"/><rect x="13.5" y="13.5" width="4.5" height="4.5" rx="0.8"/>
    </svg>`,
    "1000": `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="1" width="3.5" height="3.5" rx="0.5"/><rect x="5.5" y="1" width="3.5" height="3.5" rx="0.5"/><rect x="10" y="1" width="3.5" height="3.5" rx="0.5"/><rect x="14.5" y="1" width="3.5" height="3.5" rx="0.5"/>
      <rect x="1" y="5.5" width="3.5" height="3.5" rx="0.5"/><rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.5"/><rect x="10" y="5.5" width="3.5" height="3.5" rx="0.5"/><rect x="14.5" y="5.5" width="3.5" height="3.5" rx="0.5"/>
      <rect x="1" y="10" width="3.5" height="3.5" rx="0.5"/><rect x="5.5" y="10" width="3.5" height="3.5" rx="0.5"/><rect x="10" y="10" width="3.5" height="3.5" rx="0.5"/><rect x="14.5" y="10" width="3.5" height="3.5" rx="0.5"/>
      <rect x="1" y="14.5" width="3.5" height="3.5" rx="0.5"/><rect x="5.5" y="14.5" width="3.5" height="3.5" rx="0.5"/><rect x="10" y="14.5" width="3.5" height="3.5" rx="0.5"/><rect x="14.5" y="14.5" width="3.5" height="3.5" rx="0.5"/>
    </svg>`,
  };
  return grids[variantId] || grids["64"];
}

function cameraIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>`;
}

function uploadIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>`;
}

function renderPersonalizationFields(fields) {
  return fields
    .map((field) => {
      if (field.tipo === "foto") {
        return `
          <div class="field">
            <label class="field-sublabel" for="photoUpload">${field.label}</label>
            <p class="upload-help">Sube una imagen horizontal en buena resolucion. Formatos permitidos: JPG, PNG o WebP. Peso maximo: 8MB.</p>
            <label class="btn-upload" for="photoUpload">
              ${uploadIcon()} Subir foto
            </label>
            <input id="photoUpload" data-field-code="${field.codigo}" type="file" accept="image/*" class="sr-only" ${field.requerido ? "required" : ""}>
            <p class="upload-status" id="uploadStatus">${state.personalization.photoUrl ? "Imagen cargada correctamente." : "Aun no has cargado una imagen."}</p>
          </div>
        `;
      }

      if (field.tipo === "texto") {
        return `
          <div class="field">
            <label class="field-sublabel" for="field-${field.codigo}">${field.label}</label>
            <input id="field-${field.codigo}" data-field-code="${field.codigo}" type="text" maxlength="120" value="${escapeHtml(state.personalization.values[field.codigo] || "")}" ${field.requerido ? "required" : ""}>
          </div>
        `;
      }

      if ((field.tipo === "select" || field.tipo === "opciones") && Array.isArray(field.opciones) && field.opciones.length > 0) {
        const current = state.personalization.values[field.codigo] || String(field.opciones[0]);
        return `
          <div class="field">
            <label class="field-sublabel" for="field-${field.codigo}">${field.label}</label>
            <select id="field-${field.codigo}" data-field-code="${field.codigo}" ${field.requerido ? "required" : ""}>
              ${field.opciones.map((option) => `<option value="${escapeHtml(String(option))}" ${String(option) === String(current) ? "selected" : ""}>${escapeHtml(String(option))}</option>`).join("")}
            </select>
          </div>
        `;
      }

      return "";
    })
    .join("");
}

function bindProductEvents(product) {
  document.querySelectorAll("[data-gallery]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      document.querySelector("#galleryImage").src = thumb.dataset.gallery;
      document.querySelectorAll("[data-gallery]").forEach((item) => item.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  document.querySelectorAll("[data-variant]").forEach((button) => {
    button.addEventListener("click", () => {
      const variant = product.variantes.find((item) => String(item.id) === String(button.dataset.variant));
      setVariant(variant);
      void renderProduct();
    });
  });

  document.querySelectorAll("[data-price-code][data-price-value]").forEach((button) => {
    button.addEventListener("click", () => {
      updatePersonalizationValue(button.dataset.priceCode, button.dataset.priceValue);
      void renderProduct();
    });
  });

  document.querySelector("#photoUpload")?.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const previewPhoto = document.querySelector("#previewPhoto");
    const previewEmpty = document.querySelector("#previewEmpty");
    const uploadStatus = document.querySelector("#uploadStatus");
    const previewUrl = URL.createObjectURL(file);
    previewPhoto.src = previewUrl;
    previewPhoto.classList.remove("is-hidden");
    previewEmpty?.classList.add("is-hidden");
    uploadStatus.textContent = "Subiendo imagen...";
    uploadStatus.classList.remove("upload-status--error", "upload-status--success");

    try {
      const payload = await uploadPersonalizationFile(file, event.target.dataset.fieldCode, product.id);
      const uploadedUrl = payload.url || payload.archivo?.url || "";
      updatePhotoUrl(uploadedUrl, {
        uploadId: Number(payload.upload_id || payload.archivo?.upload_id || 0),
        uploadToken: payload.upload_token || "",
        fieldCode: event.target.dataset.fieldCode || "",
      });
      previewPhoto.src = resolveMediaUrl(uploadedUrl);
      uploadStatus.textContent = "Imagen cargada correctamente.";
      uploadStatus.classList.add("upload-status--success");
    } catch (error) {
      updatePhotoUrl("");
      previewPhoto.classList.add("is-hidden");
      previewEmpty?.classList.remove("is-hidden");
      uploadStatus.textContent = error.message || "No fue posible subir la imagen.";
      uploadStatus.classList.add("upload-status--error");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  });

  document.querySelectorAll("[data-field-code]").forEach((field) => {
    if (field.type === "file") return;
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updatePersonalizationValue(field.dataset.fieldCode, event.target.value);
    });
  });

  document.querySelector("#addToCart").addEventListener("click", () => {
    addConfiguredProductToCart(product);
    updateCartBadge();
    navigate("/carrito");
  });
}

function renderCart() {
  const hasItems = state.cart.length > 0;
  app.innerHTML = `
    <section class="section page-head">
      <p class="eyebrow">Carrito</p>
      <h1>Revisa tu pedido personalizado.</h1>
      <p>El carrito conserva la variante, la cantidad y el resumen de personalizacion que luego se enviara al backend.</p>
    </section>
    <section class="cart-layout">
      <div class="panel">${hasItems ? state.cart.map(cartItemMarkup).join("") : emptyCartMarkup()}</div>
      <aside class="summary-panel">
        ${summaryMarkup()}
        <a class="btn primary full-width" href="${withBase("/checkout/")}" data-route="/checkout" ${hasItems ? "" : 'aria-disabled="true"'}>Continuar a checkout</a>
      </aside>
    </section>
  `;
  bindCartEvents();
}

function cartItemMarkup(item) {
  const image = resolveMediaUrl(item.personalization.photoUrl || item.image || "");
  const itemSubtotal = item.unitPrice * item.quantity;
  return `
    <article class="cart-item">
      <div class="cart-item__media">
        ${image ? `<img src="${image}" alt="${escapeHtml(item.productName)}">` : `<div class="cart-item__placeholder">${placeholderMedia(item.productName)}</div>`}
      </div>
      <div class="cart-item__main">
        <p class="cart-item__eyebrow">Producto personalizado</p>
        <h3>${escapeHtml(item.productName)}</h3>
        <div class="cart-item__config">
          <span>${escapeHtml(item.variant.label || "Configuracion seleccionada")}</span>
          ${item.variant.size ? `<small>${escapeHtml(item.variant.size)}</small>` : ""}
        </div>
        ${cartPersonalizationMarkup(item)}
      </div>
      <div class="cart-item__totals">
        <p class="cart-item__price-label">Precio unitario</p>
        <strong class="cart-item__unit">${money(item.unitPrice)}</strong>
        <div class="quantity-control" aria-label="Cantidad">
          <button type="button" data-quantity="-1">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-quantity="1">+</button>
        </div>
        <button class="cart-remove" type="button" data-remove-item>Eliminar</button>
        <div class="cart-item__subtotal">
          <span>Subtotal</span>
          <strong>${money(itemSubtotal)}</strong>
        </div>
      </div>
    </article>
  `;
}

function cartPersonalizationMarkup(item) {
  const values = item.personalization?.values || {};
  const selectedRawValue = String(item.variant?.raw?.valor || "");
  const rows = [
    {
      label: "Foto",
      value: item.personalization?.photoUrl ? "Cargada correctamente" : "Pendiente por cargar",
      tone: item.personalization?.photoUrl ? "ok" : "pending",
    },
    ...Object.entries(values)
      .filter(([, value]) => String(value).trim() !== "" && String(value) !== selectedRawValue)
      .map(([key, value]) => ({
        label: formatLabel(key),
        value: String(value),
        tone: "",
      })),
  ];

  return `
    <dl class="cart-details">
      ${rows
        .map(
          (row) => `
        <div class="cart-detail ${row.tone ? `cart-detail--${row.tone}` : ""}">
          <dt>${escapeHtml(row.label)}</dt>
          <dd>${escapeHtml(row.value)}</dd>
        </div>
      `
        )
        .join("")}
    </dl>
  `;
}

function emptyCartMarkup() {
  return `
    <div class="empty-state">
      <h3>Tu carrito esta listo para empezar.</h3>
      <p>Explora el catálogo, elige un producto y prepara su personalización.</p>
      <a class="btn secondary" href="${withBase("/catalogo/")}" data-route="/catalogo">Explorar productos</a>
    </div>
  `;
}

function summaryMarkup() {
  const subtotal = cartSubtotal();
  const totalQuantity = cartQuantity();
  return `
    <h3>Resumen del carrito</h3>
    <div class="total-row"><span>${totalQuantity} unidad${totalQuantity === 1 ? "" : "es"}</span><strong>${money(subtotal)}</strong></div>
    <div class="total-row"><span>Envio</span><strong>Por confirmar</strong></div>
    <div class="total-row grand"><span>Total estimado</span><strong>${money(subtotal)}</strong></div>
    <div class="cart-summary-note">
      <strong>Incluye personalizacion</strong>
      <span>Foto, frase grabada y configuracion elegida quedaran asociadas al pedido.</span>
    </div>
    <p class="helper">El pago quedara conectado a Wompi en la integracion final.</p>
  `;
}

function bindCartEvents() {
  document.querySelectorAll("[data-quantity]").forEach((button) => {
    button.addEventListener("click", () => {
      updateQuantity(button.dataset.quantity);
      updateCartBadge();
      renderCart();
    });
  });

  document.querySelector("[data-remove-item]")?.addEventListener("click", () => {
    removeCartItem();
    updateCartBadge();
    renderCart();
  });
}

function renderCheckout() {
  app.innerHTML = `
    <div class="chk-layout">
      <form class="chk-left" id="checkoutForm" novalidate>
        <div class="chk-section">
          <h2 class="chk-section__title">
            <span class="chk-num chk-num--active">1</span>
            Informacion de contacto
          </h2>
          <div class="chk-grid">
            <div class="field">
              <label class="chk-label" for="customerName">Nombre completo <span class="required-mark">*</span></label>
              <input id="customerName" name="customerName" required autocomplete="name" placeholder="Juan Perez">
            </div>
            <div class="field">
              <label class="chk-label" for="company">Nombre de la empresa <span class="optional-mark">Opcional</span></label>
              <input id="company" name="company" autocomplete="organization" placeholder="Luna Creativa Studios">
            </div>
          </div>
          <div class="chk-grid">
            <div class="field">
              <label class="chk-label" for="email">Correo electronico <span class="required-mark">*</span></label>
              <input id="email" name="email" required type="email" autocomplete="email" inputmode="email" placeholder="compras@empresa.com">
            </div>
            <div class="field">
              <label class="chk-label" for="phone">Celular <span class="required-mark">*</span></label>
              <input id="phone" name="phone" required type="tel" autocomplete="tel" inputmode="numeric" maxlength="10" pattern="3[0-9]{9}" placeholder="3001234567">
            </div>
          </div>
        </div>

        <div class="chk-section">
          <h2 class="chk-section__title">
            <span class="chk-num">2</span>
            Logistica de envio
          </h2>
          <div class="field">
            <label class="chk-label" for="address">Direccion principal <span class="required-mark">*</span></label>
            <input id="address" name="address" required autocomplete="street-address" placeholder="Calle 10 # 8-07">
          </div>
          <div class="field">
            <label class="chk-label" for="addressDetails">Indicaciones adicionales <span class="optional-mark">Opcional</span></label>
            <input id="addressDetails" name="addressDetails" autocomplete="address-line2" placeholder="Apartamento 402, torre B, oficina, recepcion...">
          </div>
          <div class="chk-grid">
            <div class="field">
              <label class="chk-label" for="department">Departamento <span class="required-mark">*</span></label>
              <select id="department" name="department" required autocomplete="address-level1">
                <option value="">Cargando departamentos...</option>
              </select>
            </div>
            <div class="field">
              <label class="chk-label" for="city">Municipio <span class="required-mark">*</span></label>
              <select id="city" name="city" required autocomplete="address-level2" disabled>
                <option value="">Selecciona primero un departamento</option>
              </select>
            </div>
          </div>
          <p class="checkout-location-status" id="locationStatus" aria-live="polite"></p>
          <div class="field">
            <label class="chk-label" for="notes">Notas del pedido (Opcional)</label>
            <textarea id="notes" name="notes" placeholder="Instrucciones de entrega, orden de compra o referencia interna..."></textarea>
          </div>
        </div>
      </form>

      <aside class="chk-summary sticky-panel">
        ${checkoutSummaryMarkup()}
      </aside>
    </div>
  `;

  document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateCheckoutForm(event.target)) return;
    const checkoutData = Object.fromEntries(new FormData(event.target).entries());
    const department = event.target.elements.department;
    checkoutData.departmentId = checkoutData.department;
    checkoutData.department = department?.selectedOptions?.[0]?.dataset?.name || checkoutData.department;
    createOrder(checkoutData);
    navigate("/confirmacion");
  });
  bindCheckoutValidation();
  void loadCheckoutLocations();
}

function checkoutSummaryMarkup() {
  const subtotal = cartSubtotal();
  const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const discount = totalQty >= 10 ? Math.round(subtotal * 0.15) : 0;
  const total = subtotal - discount;
  const hasItems = state.cart.length > 0;

  return `
    <h3>Resumen del pedido</h3>
    ${
      hasItems
        ? `<div class="chk-items">${state.cart.map(chkItemMarkup).join("")}</div>`
        : `<p class="muted chk-empty-note">Agrega productos al carrito para continuar.</p>`
    }
    <div class="chk-breakdown">
      <div class="chk-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      ${discount > 0 ? `<div class="chk-row chk-row--discount"><span>Descuento Bulk (15%)</span><span>-${money(discount)}</span></div>` : ""}
      <div class="chk-row"><span>Envio</span><span>Por confirmar</span></div>
    </div>
    <div class="chk-total">
      <span>Total a pagar</span>
      <strong>${money(hasItems ? total : 0)}</strong>
    </div>
    <p class="chk-shipping-note">El envio se confirmara despues de validar transportadora, ciudad y direccion.</p>
    <button class="chk-wompi-btn" type="submit" form="checkoutForm" ${hasItems ? "" : "disabled"}>
      ${wompiIcon()} Pagar con Wompi
    </button>
    <p class="chk-ssl">Transaccion segura &mdash; Cifrado SSL 256-bit</p>
  `;
}

function chkItemMarkup(item) {
  const img = resolveMediaUrl(item.personalization.photoUrl || item.image || "");
  return `
    <div class="chk-item">
      ${img ? `<img class="chk-item__img" src="${img}" alt="${escapeHtml(item.productName)}">` : `<div class="chk-item__img chk-item__img--placeholder">${placeholderMedia(item.productName)}</div>`}
      <div class="chk-item__info">
        <strong>${escapeHtml(item.productName)}</strong>
        <span>${item.quantity} unidad${item.quantity === 1 ? "" : "es"} &middot; ${escapeHtml(item.variant.label)}</span>
      </div>
      <span class="chk-item__price">${money(item.unitPrice * item.quantity)}</span>
    </div>
  `;
}

function bindCheckoutValidation() {
  const form = document.querySelector("#checkoutForm");
  const phone = document.querySelector("#phone");

  phone?.addEventListener("input", () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
  });
}

function validateCheckoutForm(form) {
  let valid = true;
  form.querySelectorAll(".field-error").forEach((item) => item.remove());
  form.querySelectorAll(".field-invalid").forEach((item) => item.classList.remove("field-invalid"));

  const validations = [
    ["customerName", "Escribe tu nombre completo."],
    ["email", "Escribe un correo valido."],
    ["phone", "Escribe un celular colombiano de 10 digitos."],
    ["address", "Escribe la direccion principal."],
    ["department", "Selecciona el departamento."],
    ["city", "Selecciona el municipio."],
  ];

  validations.forEach(([fieldId, message]) => {
    const field = form.elements[fieldId];
    if (!field) return;
    if (!field.checkValidity()) {
      valid = false;
      showFieldError(field, message);
    }
  });

  return valid;
}

function showFieldError(field, message) {
  field.classList.add("field-invalid");
  const error = document.createElement("p");
  error.className = "field-error";
  error.textContent = message;
  field.closest(".field")?.append(error);
}

function clearFieldError(field) {
  field.classList.remove("field-invalid");
  field.closest(".field")?.querySelector(".field-error")?.remove();
}

async function loadCheckoutLocations() {
  const departmentSelect = document.querySelector("#department");
  const citySelect = document.querySelector("#city");
  const status = document.querySelector("#locationStatus");
  if (!departmentSelect || !citySelect) return;

  try {
    const departments = await fetchColombiaDepartments();
    departmentSelect.innerHTML = `<option value="">Selecciona departamento</option>${departments
      .map((department) => `<option value="${department.id}" data-name="${escapeHtml(department.name)}">${escapeHtml(department.name)}</option>`)
      .join("")}`;
    status.textContent = "";
  } catch (error) {
    departmentSelect.innerHTML = `<option value="">No fue posible cargar departamentos</option>`;
    status.textContent = "No pudimos cargar departamentos y municipios en este momento. Intenta nuevamente.";
  }

  departmentSelect.addEventListener("change", async () => {
    const selectedOption = departmentSelect.selectedOptions[0];
    departmentSelect.dataset.name = selectedOption?.dataset.name || "";
    citySelect.dataset.name = "";
    citySelect.disabled = true;
    citySelect.innerHTML = `<option value="">Cargando municipios...</option>`;
    status.textContent = "";

    if (!departmentSelect.value) {
      citySelect.innerHTML = `<option value="">Selecciona primero un departamento</option>`;
      return;
    }

    try {
      const cities = await fetchColombiaCities(departmentSelect.value);
      citySelect.innerHTML = `<option value="">Selecciona municipio</option>${cities
        .map((city) => `<option value="${escapeHtml(city.name)}">${escapeHtml(city.name)}</option>`)
        .join("")}`;
      citySelect.disabled = false;
    } catch (error) {
      citySelect.innerHTML = `<option value="">No fue posible cargar municipios</option>`;
      status.textContent = "No pudimos cargar municipios para este departamento. Intenta nuevamente.";
    }
  });
}

function wompiIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
}

function renderConfirmation() {
  const code = state.lastOrder?.code || "";
  if (code) sessionStorage.setItem("luna_creativa_tracking_pending", code);
  app.innerHTML = `
    <section class="confirmation">
      <div class="panel">
        <p class="eyebrow">Pedido recibido</p>
        <h1>Gracias. Tu pedido entro a confirmacion.</h1>
        <p>Te enviaremos el codigo por correo para consultar el avance cuando quieras.</p>
        ${code ? `<div class="order-code">${escapeHtml(code)}</div>` : ""}
        <div class="footer-actions">
          <a class="btn primary" href="${withBase("/seguimiento/")}" data-route="/seguimiento">Consultar seguimiento</a>
          <a class="btn secondary" href="${withBase("/catalogo/")}" data-route="/catalogo">Volver al catalogo</a>
        </div>
      </div>
    </section>
  `;
}

async function renderTracking() {
  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get("codigo") || sessionStorage.getItem("luna_creativa_tracking_pending") || "";
  sessionStorage.removeItem("luna_creativa_tracking_pending");
  if (params.has("codigo")) {
    window.history.replaceState({}, "", withBase("/seguimiento/"));
  }
  app.innerHTML = `
    <div class="trk-hero">
      <div class="trk-hero__inner">
        <p class="trk-hero__label">Ingresa tu codigo de seguimiento</p>
        <form class="trk-search" id="trackingForm">
          <input id="trackingCode" class="trk-search__input" value="${escapeHtml(initialCode)}" placeholder="Codigo recibido por correo" required>
          <button class="trk-search__btn" type="submit">Rastrear Pedido</button>
        </form>
      </div>
    </div>
    <div class="section trk-results-wrapper" id="trackingResult">
      ${trackingResultMarkup(null)}
    </div>
  `;

  const trackingResult = document.querySelector("#trackingResult");

  async function searchTracking(code) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      trackingResult.innerHTML = trackingResultMarkup(null);
      return;
    }

    trackingResult.innerHTML = trackingLoadingMarkup();
    window.history.replaceState({}, "", withBase("/seguimiento/"));

    try {
      const payload = await fetchOrderTracking(cleanCode);
      trackingResult.innerHTML = trackingResultMarkup(normalizeTrackingOrder(payload.pedido));
    } catch (error) {
      trackingResult.innerHTML = trackingMissingMarkup(cleanCode, error.message);
    }
  }

  document.querySelector("#trackingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    void searchTracking(document.querySelector("#trackingCode").value);
  });

  if (initialCode) {
    await searchTracking(initialCode);
  }
}

function trackingResultMarkup(order) {
  if (!order) {
    return `
      <div class="trk-empty">
        <div class="trk-empty__icon">${trkPackageIcon()}</div>
        <h3>Consulta el estado de tu pedido</h3>
        <p>Usa el codigo de seguimiento que recibiste por correo al confirmar tu compra.</p>
      </div>`;
  }

  const timelineItems = order.tracking
    .map((step, i) => {
      const isDone = step.estado === "ok";
      const isCurrent = i === order.statusIndex;
      const subText = step.fecha ? formatTrackingDate(step.fecha) : isCurrent ? `Activo &middot; ${order.status}` : "Pendiente";
      const parts = [
        `<div class="trk-step ${isDone ? "done" : isCurrent ? "current" : "pending"}">
          <div class="trk-step__node">${step.icon}</div>
          <strong>${escapeHtml(step.label)}</strong>
          <span>${subText}</span>
        </div>`,
      ];
      if (i < order.tracking.length - 1) {
        parts.push(`<div class="trk-connector ${isDone ? "done" : ""}"></div>`);
      }
      return parts.join("");
    })
    .join("");

  const activitiesMarkup = order.activities?.length
    ? `<div class="trk-activity">
        <h3>Actividad Reciente</h3>
        <div class="trk-activity__list">
          ${order.activities
            .map(
              (act, i) => `
            <div class="trk-activity-item ${i > 0 ? "trk-activity-item--past" : ""}">
              <div class="trk-activity-item__dot"></div>
              <div class="trk-activity-item__content">
                <strong>${escapeHtml(act.text)}</strong>
                <span>${escapeHtml([act.location, formatTrackingDate(act.date)].filter(Boolean).join(" · "))}</span>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  const guideMarkup =
    order.statusIndex >= 2 && order.guide
      ? `<a class="trk-guide-link" href="${escapeHtml(order.guideUrl)}" target="_blank" rel="noreferrer">
          ${trkExternalIcon()} Ver guia
        </a>`
      : "";

  return `
    <div class="trk-layout">
      <div class="trk-left">
        <div class="trk-status-card">
          <div class="trk-status-card__head">
            <div>
              <h2>Estado del Envio</h2>
              <p>Pedido #${escapeHtml(order.code)} &mdash; Luna Creativa</p>
            </div>
            <span class="trk-badge ${trkBadgeClass(order.statusIndex)}">${trkBadgeLabel(order.statusIndex)}</span>
          </div>
          <div class="trk-timeline">${timelineItems}</div>
        </div>
        ${activitiesMarkup}
      </div>

      <aside class="trk-right">
        <div class="trk-info-card">
          <div class="trk-info-card__head">
            ${trkInfoIcon()} Informacion de Envio
          </div>
          <div class="trk-info-field">
            <span>Transportadora</span>
            <strong>${escapeHtml(order.carrier || "Por confirmar")}</strong>
          </div>
          <div class="trk-info-field">
            <span>Guia</span>
            <strong>${escapeHtml(order.guide || "Por confirmar")}</strong>
          </div>
          <div class="trk-info-field">
            <span>Ciudad</span>
            <strong>${escapeHtml(order.city || "Por confirmar")}</strong>
          </div>
          <div class="trk-info-field">
            <span>Direccion</span>
            <strong>${escapeHtml(order.address || "Por confirmar")}</strong>
          </div>
          ${guideMarkup}
        </div>

        <div class="trk-support-card">
          <h3>Necesitas ayuda?</h3>
          <p>Si tienes dudas sobre tu fabricacion especial, nuestro equipo B2B esta listo para asistirte.</p>
          <span class="trk-support-link">Contactar Soporte &rarr;</span>
        </div>

        <div class="trk-product-card">
          ${storefront.product ? (productImage(storefront.product) ? `<img src="${productImage(storefront.product)}" alt="${storefront.product.nombre}">` : placeholderMedia(storefront.product.nombre)) : placeholderMedia("Producto Luna Creativa")}
          <div class="trk-product-card__label">
            <span>Cliente</span>
            <strong>${escapeHtml(order.customer || "Cliente Luna Creativa")}</strong>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function trackingLoadingMarkup() {
  return `
    <div class="trk-empty">
      <div class="trk-empty__icon">${trkSearchIcon()}</div>
      <h3>Consultando pedido</h3>
      <p>Estamos revisando el estado actualizado de tu orden.</p>
    </div>`;
}

function trackingMissingMarkup(code, message = "") {
  return `
    <div class="trk-empty trk-empty--error">
      <div class="trk-empty__icon">${trkSearchIcon()}</div>
      <h3>No encontramos "${escapeHtml(code)}"</h3>
      <p>${escapeHtml(message || "Verifica el codigo o contacta a Luna Creativa para confirmar los datos de tu pedido.")}</p>
    </div>`;
}

function normalizeTrackingOrder(pedido = {}) {
  const tracking = (pedido.tracking || []).map((step) => ({
    ...step,
    icon: trackingIcon(step.codigo),
  }));
  const statusIndex = currentTrackingIndex(tracking);
  const envio = pedido.envio || {};
  return {
    code: pedido.codigo || pedido.reference || "",
    customer: pedido.cliente?.nombre || pedido.cliente?.email || "",
    status: tracking[statusIndex]?.label || pedido.estado || "En proceso",
    statusIndex,
    carrier: envio.transportadora || tracking.find((step) => step.transportadora)?.transportadora || "",
    guide: envio.numero_guia || tracking.find((step) => step.guia)?.guia || "",
    guideUrl: envio.url_guia || "",
    city: envio.ciudad || "",
    address: envio.direccion || "",
    tracking,
    activities: (pedido.actividad || []).map((activity) => ({
      text: activity.titulo || activity.codigo || "Actualizacion del pedido",
      location: activity.detalle || "Luna Creativa",
      date: activity.fecha || "",
    })),
  };
}

function currentTrackingIndex(tracking = []) {
  const lastOk = tracking.reduce((lastIndex, step, index) => (step.estado === "ok" ? index : lastIndex), -1);
  if (lastOk >= tracking.length - 1) return Math.max(0, tracking.length - 1);
  return Math.max(0, lastOk + 1);
}

function trackingIcon(code = "") {
  const icons = {
    confirmacion: trkCheckIcon(),
    fabricacion: trkGearIcon(),
    despachada: trkTruckIcon(),
    entregada: trkPackageIcon(),
  };
  return icons[code] || trkPackageIcon();
}

function formatTrackingDate(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function trkBadgeClass(statusIndex) {
  return ["trk-badge--confirmado", "trk-badge--fabricacion", "trk-badge--camino", "trk-badge--entregado"][statusIndex] || "trk-badge--confirmado";
}

function trkBadgeLabel(statusIndex) {
  return ["CONFIRMADO", "EN FABRICACION", "EN CAMINO", "ENTREGADO"][statusIndex] || "EN PROCESO";
}

function trkCheckIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

function trkGearIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}

function trkTruckIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
}

function trkPackageIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
}

function trkInfoIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}

function trkExternalIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
}

function trkSearchIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
}

async function ensureCatalog() {
  if (!storefront.catalog) {
    storefront.catalog = await fetchCatalog();
  }
  return storefront.catalog;
}

async function ensurePrimaryProduct() {
  const catalog = await ensureCatalog();
  const products = catalog.productos || [];
  const requestedProduct = requestedProductSlug();
  const slug = resolveRequestedProductSlug(products, requestedProduct);

  if (!slug) {
    if (catalog.setup_required) {
      throw new Error("El catálogo todavía no está configurado. Publica el rompecabezas en Tienda para habilitar este enlace.");
    }
    if (requestedProduct) {
      throw new Error("El rompecabezas solicitado todavía no está publicado en la tienda.");
    }
    throw new Error("No hay productos publicados en el catálogo.");
  }

  if (storefront.product && storefront.productSlug === slug) return storefront.product;
  const detail = await fetchProductDetail(slug);
  storefront.product = detail.producto;
  storefront.productSlug = slug;
  return storefront.product;
}

function requestedProductSlug() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("slug") || params.get("producto") || "").trim().toLowerCase();
}

function resolveRequestedProductSlug(products, requestedSlug) {
  if (!requestedSlug) return products[0]?.slug || "";

  const exact = products.find((product) => String(product.slug).toLowerCase() === requestedSlug);
  if (exact) return exact.slug;

  // La landing comercial ya identifica el producto como `rompecabezas-64`.
  // Este alias permite conservar ese enlace aunque el slug administrativo sea
  // `rompecabezas-personalizado` u otro equivalente publicado en el catálogo.
  if (requestedSlug === "rompecabezas-64") {
    const puzzle = products.find((product) =>
      [product.slug, product.nombre]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes("rompecabezas")
    );
    return puzzle?.slug || "";
  }

  return "";
}

function productDetailPath(product) {
  const slug = String(product?.slug || "").trim();
  return slug ? `/producto/?slug=${encodeURIComponent(slug)}` : "/producto/";
}

function productImage(product) {
  if (!product) return "";
  return resolveMediaUrl(product.imagen_principal || product.imagenes?.[0]?.url || "");
}

function productImages(product) {
  const fromGallery = (product.imagenes || []).map((image) => resolveMediaUrl(image.url)).filter(Boolean);
  const fallback = product.imagen_principal ? [resolveMediaUrl(product.imagen_principal)] : [];
  const images = [...new Set([...fromGallery, ...fallback])];
  return images;
}

function activeCategorySlug() {
  return new URLSearchParams(window.location.search).get("categoria") || "";
}

function activeSearchQuery() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

function filterProductsByCategory(products, categorySlug) {
  if (!categorySlug) return products;
  return products.filter((product) => product.categoria?.slug === categorySlug);
}

function filterProductsBySearch(products, query) {
  const search = String(query || "").trim().toLowerCase();
  if (!search) return products;
  return products.filter((product) =>
    [product.nombre, product.descripcion_corta, product.descripcion_larga, product.categoria?.nombre]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search)
  );
}

function searchSuggestionMarkup(product) {
  const image = productImage(product);
  const detailPath = productDetailPath(product);
  return `
    <a class="site-search__item" href="${withBase(detailPath)}" data-route="/producto">
      ${image ? `<img src="${image}" alt="${escapeHtml(product.nombre)}">` : `<span class="site-search__thumb"></span>`}
      <span>
        <strong>${escapeHtml(product.nombre)}</strong>
        <small>Desde ${money(Number(product.precio_base || 0))}</small>
      </span>
    </a>
  `;
}

function primaryPricingField(product) {
  return (product?.opciones_producto || []).find((field) => Array.isArray(field.valores) && field.valores.length > 0) || null;
}

function currentProductPrice(product) {
  const pricingField = primaryPricingField(product);
  if (pricingField) {
    const currentValue = String(state.personalization.values[pricingField.codigo] || pricingField.valores?.[0]?.valor || "");
    const selectedOption =
      pricingField.valores.find((option) => String(option.valor) === currentValue) || pricingField.valores[0] || null;
    return Number(selectedOption?.precio || product.precio_base || 0);
  }

  return Number(state.selectedVariant?.price || product.variantes?.[0]?.precio || product.precio_base || 0);
}

function resolveMediaUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("assets/tienda/")) {
    return withBase(`/api/tienda_asset.php?path=${encodeURIComponent(value)}`);
  }
  if (value.startsWith("/")) return value;
  return withBase(`/${value}`);
}

function placeholderMedia(label = "Producto Luna Creativa") {
  return `<div class="media-placeholder"><span>${escapeHtml(label)}</span></div>`;
}

function personalizationSummary(values = {}) {
  const entries = Object.entries(values || {}).filter(([, value]) => String(value).trim() !== "");
  if (!entries.length) return "<strong>Personalizacion:</strong> Sin detalles adicionales";
  return entries
    .map(([key, value]) => `<strong>${escapeHtml(formatLabel(key))}:</strong> ${escapeHtml(String(value))}`)
    .join("<br>");
}

function formatLabel(key) {
  return key.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function iconByIndex(index) {
  const icons = [puzzleIcon(), mugIcon(), laserIcon(), penIcon(), homeIcon(), giftIcon()];
  return icons[index % icons.length];
}

function renderStoreError(error) {
  app.innerHTML = `
    <section class="section">
      <div class="panel">
        <p class="eyebrow">Tienda publica</p>
        <h1>No fue posible cargar el catalogo</h1>
        <p>${escapeHtml(error?.message || "Intenta nuevamente en unos minutos.")}</p>
      </div>
    </section>
  `;
}

window.addEventListener("beforeunload", saveState);
