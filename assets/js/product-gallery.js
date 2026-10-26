const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function bindProductGallery(root = document) {
  const main = root.querySelector(".pdp-gallery__main");
  const image = main?.querySelector("img");
  if (!image) return;
  const thumbs = [...root.querySelectorAll("[data-gallery]")];
  const images = thumbs.length ? thumbs.map((thumb) => thumb.dataset.gallery) : [image.src];
  const gallery = main.closest(".pdp-gallery");
  gallery.classList.add("product-gallery");
  main.tabIndex = 0;
  main.setAttribute("role", "button");
  main.setAttribute("aria-label", "Ampliar fotos del producto");
  const hint = document.createElement("p");
  hint.className = "product-gallery__hint";
  hint.textContent = finePointer() ? "Pasa el mouse para ver los detalles · Haz clic para ampliar" : "Toca la foto para ampliar";
  gallery.append(hint);
  const zoom = document.createElement("div");
  zoom.className = "product-gallery__zoom";
  zoom.setAttribute("aria-hidden", "true");
  zoom.hidden = true;
  gallery.append(zoom);
  main.addEventListener("pointermove", (event) => {
    if (!finePointer() || event.pointerType === "touch" || !image.naturalWidth) return;
    const rect = main.getBoundingClientRect();
    // Show the same square composition as the gallery, with its white margins.
    const padding = parseFloat(getComputedStyle(image).paddingLeft) || 0;
    const fitted = Math.min((rect.width - padding * 2) / image.naturalWidth, (rect.height - padding * 2) / image.naturalHeight);
    const fittedWidth = image.naturalWidth * fitted;
    const fittedHeight = image.naturalHeight * fitted;
    const x = clamp((event.clientX - rect.left - (rect.width - fittedWidth) / 2) / fittedWidth, 0, 1);
    const y = clamp((event.clientY - rect.top - (rect.height - fittedHeight) / 2) / fittedHeight, 0, 1);
    const room = innerWidth - rect.right - 24;
    zoom.classList.toggle("product-gallery__zoom--inside", room < 280);
    zoom.style.width = `${room < 280 ? rect.width : Math.min(room, 560)}px`;
    zoom.style.height = `${Math.min(rect.height, 560)}px`;
    zoom.hidden = false;
    const width = image.naturalWidth * fitted * 2.5;
    const height = image.naturalHeight * fitted * 2.5;
    zoom.style.backgroundImage = `url(${JSON.stringify(image.currentSrc || image.src)})`;
    zoom.style.backgroundSize = `${width}px ${height}px`;
    zoom.style.backgroundPosition = `${zoom.clientWidth / 2 - x * width}px ${zoom.clientHeight / 2 - y * height}px`;
  });
  const hide = () => { zoom.hidden = true; };
  main.addEventListener("pointerleave", hide);
  main.addEventListener("blur", hide);
  const open = () => {
    hide();
    const selected = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains("active")));
    openImageViewer(images, selected, image.alt, main);
  };
  main.addEventListener("click", open);
  main.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
  });
  thumbs.forEach((thumb) => thumb.addEventListener("pointerenter", () => {
    if (finePointer()) { hide(); thumb.click(); }
  }));
}

function openImageViewer(images, initial, title, trigger) {
  const dialog = document.createElement("dialog");
  dialog.className = "product-viewer";
  dialog.setAttribute("aria-label", "Fotos del producto");
  dialog.innerHTML = `
    <div class="product-viewer__bar">
      <span class="product-viewer__count" aria-live="polite"></span>
      <button type="button" data-close aria-label="Cerrar visor">Cerrar ×</button>
    </div>
    <div class="product-viewer__stage">
      <img draggable="false" alt="">
    </div>
    <button type="button" class="product-viewer__prev" aria-label="Foto anterior">‹</button>
    <button type="button" class="product-viewer__next" aria-label="Foto siguiente">›</button>
    <p class="product-viewer__help"></p>
    <div class="product-viewer__thumbs" aria-label="Seleccionar foto"></div>`;
  document.body.append(dialog);
  const stage = dialog.querySelector(".product-viewer__stage");
  const img = stage.querySelector("img");
  const pointers = new Map();
  let index = initial, gesture = null;
  const thumbButtons = images.map((url, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Ver foto ${i + 1}`);
    const small = document.createElement("img");
    small.src = url; small.alt = "";
    button.append(small);
    button.addEventListener("click", () => show(i));
    dialog.querySelector(".product-viewer__thumbs").append(button);
    return button;
  });
  function show(next) {
    index = (next + images.length) % images.length;
    img.src = images[index]; img.alt = `${title || "Producto"} · Foto ${index + 1}`;
    dialog.querySelector(".product-viewer__count").textContent = `${index + 1} / ${images.length}`;
    thumbButtons.forEach((button, i) => button.setAttribute("aria-current", String(i === index)));
    dialog.querySelector(".product-viewer__prev").hidden = images.length < 2;
    dialog.querySelector(".product-viewer__next").hidden = images.length < 2;
  }
  dialog.querySelector(".product-viewer__help").textContent = "Desliza o usa las flechas para cambiar de foto";
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.querySelector(".product-viewer__prev").onclick = () => show(index - 1);
  dialog.querySelector(".product-viewer__next").onclick = () => show(index + 1);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); show(index + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, true);
    if (pointers.size > 1) gesture = null;
    else gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
  });
  const end = (event) => {
    const g = gesture;
    pointers.delete(event.pointerId);
    if (!g || g.id !== event.pointerId || pointers.size) { gesture = null; return; }
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (event.type !== "pointercancel" && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      show(index + (dx < 0 ? 1 : -1));
    }
    gesture = null;
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  const closeOnRoute = () => dialog.close();
  window.addEventListener("popstate", closeOnRoute);
  dialog.addEventListener("close", () => {
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("popstate", closeOnRoute);
    dialog.remove();
    if (trigger.isConnected) trigger.focus({preventScroll: true});
  }, {once: true});
  dialog.showModal();
  show(initial);
}
