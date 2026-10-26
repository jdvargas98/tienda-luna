import { withBase } from "./config.js?v=20260823-product-route";

export function bindFooterSubscription(footer) {
  if (!footer) return;
  const form = footer.querySelector("[data-footer-subscription]");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";
  const status = footer.querySelector("[data-footer-status]");
  const submit = form.querySelector('button[type="submit"]');

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `global-footer__status global-footer__status--${type}`;
    status.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.hidden = true;

    try {
      const response = await fetch(withBase("/api/suscripcion.php"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          privacy_accepted: data.get("privacy_accepted") === "yes",
          website: data.get("website"),
          source_page: window.location.pathname,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "No pudimos completar la suscripción.");
      }

      form.reset();
      showStatus(result.message, "success");
      window.LunaTracking?.track("sign_up", { method: "footer_newsletter" });
    } catch (error) {
      showStatus(error.message || "No pudimos completar la suscripción. Inténtalo nuevamente.", "error");
    } finally {
      submit.disabled = false;
      form.setAttribute("aria-busy", "false");
    }
  });
}
