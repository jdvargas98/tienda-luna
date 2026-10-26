import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("rutas de raíz y compatibilidad con /tienda sin falsos prefijos", () => {
  const source = fs.readFileSync(path.join(root, "assets/js/config.js"), "utf8").replaceAll("export ", "");
  for (const [pathname, expected] of [["/", ""], ["/producto/", ""], ["/tienda/catalogo/", "/tienda"], ["/tienda", "/tienda"], ["/tienda-nueva/", ""]]) {
    const context = vm.createContext({ window: { location: { pathname } } });
    vm.runInContext(`${source}\nglobalThis.actual = [BASE_PATH, withBase('/api/tienda_publica.php')];`, context);
    assert.equal(context.actual[0], expected);
    assert.equal(context.actual[1], `${expected}/api/tienda_publica.php`);
  }
});

test("paquete solo público y sin otras aplicaciones ni borradores internos", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "luna-deploy-test-"));
  for (const entry of ["scripts", "deploy", "assets", "components", "api", "legal", "catalogo", "carrito", "checkout", "confirmacion", "producto", "servicios", "seguimiento", "visita", "index.html", ".htaccess"]) {
    fs.cpSync(path.join(root, entry), path.join(temp, entry), { recursive: true });
  }
  execFileSync(process.execPath, [path.join(temp, "scripts/prepare-deploy.mjs")]);
  const packaged = path.join(temp, ".deploy-root");
  for (const blocked of ["cotizador", "cotizador-pruebas", "landing-rompe", "docs", "scripts", "tests", "catalogo/borradores", "api/config.php"])
    assert.equal(fs.existsSync(path.join(packaged, blocked)), false, blocked);
  for (const required of ["index.html", ".htaccess", "api/backend_path.php", "confirmacion/index.html", "legal/index.html", "assets/js/product-gallery.js"])
    assert.equal(fs.existsSync(path.join(packaged, required)), true, required);
  assert.deepEqual(fs.readdirSync(path.join(packaged, "tienda")), [".htaccess"]);
  assert.throws(() => execFileSync(process.execPath, [path.join(temp, "scripts/prepare-deploy.mjs")], { stdio: "pipe" }));
  console.log(`Paquete de comprobación conservado en ${packaged}`);
});

test("despliegue manual sin limpieza global y con ámbito protegido", () => {
  const yaml = fs.readFileSync(path.join(root, ".github/workflows/deploy.yml"), "utf8");
  assert.match(yaml, /workflow_dispatch:/);
  assert.doesNotMatch(yaml, /^\s+push:/m);
  assert.match(yaml, /dangerous-clean-slate: false/);
  assert.match(yaml, /state-name: \.ftp-deploy-luna-web-root\.json/);
  assert.match(yaml, /cotizador\/\*\*/);
  assert.match(yaml, /environment: production-home/);
});

test("footer independiente del Home descartado", () => {
  const html = fs.readFileSync(path.join(root, "components/footer.html"), "utf8");
  assert.doesNotMatch(html, /home\.test|__HOME__|\/views\//);
  assert.match(html, /__BASE__\/servicios\//);
  assert.match(html, /__BASE__\/legal\/contacto.html/);
});
