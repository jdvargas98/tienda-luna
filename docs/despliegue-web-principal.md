# Web comercial en public_html: preparación de migración

Estado: preparado en local, sin commit/push ni despliegue. No se mueve ni se publica Cotizador con esta web.

## Destino y propiedad

- Este repositorio será el dueño de la web comercial principal en `/home/lunacrae/public_html/`.
- Cotizador y Cotizador Pruebas conservan repositorios, carpetas y despliegues propios. El paquete no los incluye.
- La API comercial sigue usando su integración actual con Cotizador. `api/backend_path.php` reconoce la ubicación al lado de la API raíz, además de las ubicaciones locales y la instalación antigua de Tienda.
- No se copian archivos, credenciales ni almacenamiento privado de Cotizador a la web comercial.
- El Home antiguo no se reutiliza para desplegar la nueva web. Su workflow externo debe desactivarse antes del cambio: puede sobrescribir la raíz y también publicar la tienda anterior.

## Cómo se prepara

`node scripts/prepare-deploy.mjs` crea `.deploy-root/` mediante una lista de archivos públicos permitidos. No incluye `.git`, workflows, docs, scripts, borradores de catálogo, respaldos, archivos SQL, configuración privada ni otras aplicaciones. Se niega a limpiar/reutilizar un destino existente; hacer otra preparación desde un checkout limpio. No subir el repositorio completo por FTP.

La carpeta `.deploy-root/` es un artefacto local ignorado por Git, no otro sitio fuente. Su contenido solo es una instantánea: repetir la preparación en un checkout limpio después de los cambios definitivos.

El workflow `Preparar y publicar web principal` solo se ejecuta manualmente. Sin marcar `publish`, genera un artefacto descargable y no utiliza FTP. Con `publish` activado, usa el entorno `production-home`; configurar aprobación requerida en GitHub si el plan permite esa protección.

## Configurar GitHub antes de publicar

Secretos en el repositorio o entorno: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_HOME_DIR`.

La captura de cuentas FTP aportada por el usuario identifica `deploy-home@lunacreativa.com.co` con acceso limitado a public_html. El workflow exige exactamente esa cuenta y `FTP_HOME_DIR=/`. Las cuentas de Cotizador, Cotizador Pruebas y Landing no se usan para la web comercial.

La raíz física de cPanel y la ruta vista por FTP no son la misma: para esta cuenta confinada, `/` representa public_html. Antes de activar la primera publicación, comprobarlo con un listado de solo lectura (debe mostrar el index, assets y las carpetas vistas en cPanel). No se realizó todavía esa conexión ni se actualizaron secretos de GitHub.

La ruta debe terminar en `/`. No usar `/public_html/tienda/` ni la carpeta `/home/lunacrae/tienda/`, que en la captura es otra ubicación.

FTPS explícito, puerto 21. Se usa un archivo de estado exclusivo `.ftp-deploy-luna-web-root.json` y no se activa limpieza total. No reutilizar un estado de sincronización de Home/Tienda anterior. FTP no es un despliegue atómico: la primera migración debe hacerse en una ventana controlada, sin despliegues concurrentes de otros repositorios.

## Lista de verificación obligatoria

- [ ] Respaldar fuera de public_html los archivos actuales de la web, `.htaccess`, estados FTP y configuración. Registrar qué se reemplaza; no guardar ZIPs públicamente.
- [ ] Respaldar la base de datos mediante el proceso administrativo autorizado. Este workflow no ejecuta SQL.
- [ ] Confirmar versión de PHP compatible con las APIs (8.1 o superior para las funciones utilizadas) y extensiones necesarias.
- [ ] Desactivar el workflow de Home anterior y asegurar que ningún despliegue de Cotizador publique fuera de su ámbito.
- [ ] Comprobar en preproducción catálogo, imágenes, carga de archivos, carrito, envío/recogida, pago de prueba, confirmación, seguimiento, visitas y suscripción.
- [ ] Resolver o aceptar conscientemente los pendientes de `revision-legal-2026-10.md`. Las políticas incluidas todavía son borradores visibles y noindex: el paquete no las convierte en documentos aprobados.
- [ ] Revisar integración Wompi y backend de creación de pedidos: no se ha certificado un pago real completo en esta preparación.
- [ ] Comparar las APIs de Home que existen en la raíz y verificar qué otros consumidores dependen de ellas. Los archivos con nombres coincidentes del paquete se reemplazarán; los ajenos no se borran automáticamente.
- [ ] Revisar `.htaccess` del servidor antes de reemplazarlo: preservar reglas del hosting, seguridad, certificados y aplicaciones independientes que aún se necesiten.
- [ ] Evitar el uso de carritos antiguos durante el corte. El almacenamiento local cambia de origen si antes se usaba tienda.test u otro subdominio, y existen cambios de estado pendientes en este repositorio.

## Rutas y archivos heredados

Se prepararon redirecciones 302 reversibles de rutas comerciales antiguas `/tienda/...` y de páginas equivalentes de `/views/`. Se conservan parámetros como `slug`. No se redirigen POST ni APIs antiguas a ciegas. Cambiar a 301 después de comprobar enlaces, campañas, SEO y estabilidad.

Las aplicaciones `cotizador`, `cotizador-pruebas`, `landing-rompe`, certificados y CGI quedan fuera del router comercial. Los directorios existentes no se borran por este paquete. No retirar WordPress, `shared`, `views`, la tienda anterior ni respaldos existentes sin una auditoría separada de dependencias y autorización.

Los enlaces del footer ahora pertenecen a esta web: no dependen de home.test o de páginas descartadas de Home. El contacto legal y las políticas residen en `/legal/`.

## Verificación posterior y vuelta atrás

El workflow comprueba la portada, un recurso JS y respuesta exitosa del catálogo. No prueba compras ni reemplaza las comprobaciones manuales. Si la verificación falla, no hay rollback automático.

Para volver atrás, restaurar desde el respaldo los archivos de raíz que se reemplazaron y su `.htaccess`; retirar solo los archivos nuevos identificados en el manifiesto del corte. No restaurar ni borrar masivamente public_html, Cotizador o archivos de clientes. Rehabilitar el Home anterior solo si se decide expresamente y con su estado de despliegue revisado.

Antes de la publicación definitiva quedan pendientes robots/sitemap/canonical y auditoría de URLs heredadas. No se publica un sitemap de borradores ni se declara completa la migración SEO con este cambio.
