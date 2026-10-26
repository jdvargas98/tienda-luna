import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, ".deploy-root");
// No limpiar directorios existentes: evita confundir una carpeta de usuario con el paquete.
if (fs.existsSync(destination)) throw new Error(".deploy-root ya existe. Usa un checkout limpio para preparar otro paquete.");
const pages = ["servicios", "catalogo", "producto", "carrito", "checkout", "confirmacion", "visita", "seguimiento", "legal"];
const files = ["index.html", ".htaccess"];
const endpoints = ["backend_path.php", "tienda_publica.php", "tienda_asset.php", "colombia_ubicaciones.php", "agendar_visita.php", "consultar_estado_pedido.php", "tienda_iniciar_carga.php", "tienda_subir_personalizacion.php", "crear_pedido.php", "suscripcion.php"];
fs.mkdirSync(destination);
function copy(relative) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) throw new Error(`Falta un archivo público requerido: ${relative}`);
  fs.cpSync(source, path.join(destination, relative), {
    recursive: true,
    filter(sourcePath) {
      if (fs.lstatSync(sourcePath).isSymbolicLink()) throw new Error(`No se permiten enlaces simbólicos: ${sourcePath}`);
      const rel = path.relative(root, sourcePath).split(path.sep).join("/");
      return !/(^|\/)(?:\.DS_Store|borradores|node_modules|vendor)(\/|$)/.test(rel)
        && !/\.(?:zip|sql|log|bak|env)$/i.test(rel);
    },
  });
}
for (const file of files) copy(file);
for (const directory of [...pages, "assets", "components"]) copy(directory);
for (const endpoint of endpoints) copy(`api/${endpoint}`);

const forbidden = ["cotizador", "cotizador-pruebas", "landing-rompe", "shared", "views", "wp-admin", "wp-content", "wp-includes", ".git", ".github", "docs", "scripts", "tests", "catalogo/borradores", "api/config.php"];
for (const entry of forbidden) {
  if (fs.existsSync(path.join(destination, entry))) throw new Error(`El paquete invade una ruta protegida: ${entry}`);
}
const entries = fs.readdirSync(destination).sort();
console.log("Paquete comercial preparado (sin publicar):", entries.join(", "));
console.log("Cotizador no forma parte del paquete. Las políticas legales siguen siendo borradores.");
