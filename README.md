# Frontend publico de Luna Creativa Tienda

Este directorio contiene el frontend publico de `/tienda` para Luna Creativa. Es una experiencia B2B estatica, ordenada por rutas reales y preparada para conectarse despues con el backend propio del cotizador.

La direccion visual toma de `http://home.test/nuevohome/` solo la tipografia Poppins y los acentos de color de Luna Creativa. La tienda mantiene fondo blanco, navegacion simple y estructura ecommerce facil de mover entre ambientes.

## Estructura

```text
tienda/
├── .htaccess
├── index.html
├── catalogo/index.html
├── producto/index.html
├── carrito/index.html
├── checkout/index.html
├── seguimiento/index.html
├── assets/
│   ├── css/
│   │   ├── app.css
│   │   ├── tokens.css
│   │   └── components.css
│   ├── js/
│   │   ├── app.js
│   │   ├── data.js
│   │   ├── cart.js
│   │   └── ui.js
│   ├── img/
│   │   ├── logo/
│   │   ├── productos/
│   │   └── icons/
│   └── fonts/
├── components/
│   ├── header.html
│   ├── footer.html
│   └── cards.html
└── README.md
```

## Rutas

- `/tienda/`: entrada publica.
- `/tienda/catalogo/`: catalogo/listado de productos.
- `/tienda/producto/`: detalle, variantes y personalizador MVP.
- `/tienda/carrito/`: carrito con resumen de personalizacion.
- `/tienda/checkout/`: datos de cliente, empresa, envio y estructura de pago.
- `/tienda/seguimiento/`: consulta publica por codigo.
- `/tienda/confirmacion/`: pantalla virtual de confirmacion servida por el fallback de `.htaccess`.

En local con Herd, si el host `tienda.test` apunta directamente a esta carpeta, usa:

- `http://tienda.test/`
- `http://tienda.test/catalogo/`
- `http://tienda.test/producto/`
- `http://tienda.test/carrito/`
- `http://tienda.test/checkout/`
- `http://tienda.test/seguimiento/`

## Modulos

- `assets/js/data.js`: productos, variantes y ejemplos de tracking.
- `assets/js/cart.js`: estado de variante, personalizacion, carrito y pedido.
- `assets/js/ui.js`: carga de header/footer, formato de moneda y estado visual del menu.
- `assets/js/app.js`: ruteo, render de pantallas y eventos de interaccion.

## Referencia visual aplicada

- Header simple con logo local en `assets/img/logo/luna-creativa.png`.
- Tipografia Poppins y acentos pink/violet de marca.
- Fondo blanco y cards de producto tipo ecommerce.
- Home de tienda con dos lanzamientos y barra de categorias.
- Productos con etiqueta, foto, rating, precio, rebaja y variantes visuales.

## Entidades front contempladas

- `producto`: ficha comercial, descripcion, galeria y variantes.
- `variante`: piezas, tamano y precio.
- `personalizacion`: foto, texto grabado y ocasion.
- `carrito`: items, cantidades y subtotal.
- `pedido`: datos de checkout, total y codigo publico.
- `tracking`: estados visibles y datos de guia.

## Integracion futura

Los puntos naturales de conexion posterior son:

- Cargar productos y variantes desde API.
- Enviar personalizacion y archivos al backend.
- Persistir carrito y pedido.
- Crear transaccion de pago con Wompi.
- Consultar tracking por codigo unico.
