# Portalmaker — "El portal del Maker"

> Plataforma multi-tenant e-commerce diseñada para talleres de Impresión 3D, Grabado Láser, CNC y Fabricación Digital.
> Dominio: [portalmaker.com.ar](https://portalmaker.com.ar)

---

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router, Server Components & Server Actions)
- **Base de Datos & Auth**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Estilos**: Tailwind CSS + Variables CSS Dinámicas por Tenant + Modo Claro/Oscuro
- **Iconografía**: `lucide-react` (exclusivo)
- **Despliegue**: Cloudflare Pages / Workers

---

## Módulos y Funcionalidades

### 1. Tienda Pública Multi-tenant
- Resolución automática de subdominio (`[slug].portalmaker.com.ar`) y dominio propio (`mitaller.com.ar`).
- **Catálogo Interactivo**:
  - Buscador multi-término en tiempo real (búsqueda por palabras en nombre y descripción).
  - Filtros por pastillas de categorías.
  - Grilla responsive con **2 columnas en mobile**.
  - Galería sincronizada bidireccionalmente con variantes de producto.
- **Carrito de Compras y Reservas**:
  - Distinción automática entre piezas en stock y piezas **bajo pedido / reserva**.
  - Control de cantidades y límites de stock.
  - Drawer deslizante interactivo accesible desde cualquier página.
- **Checkout Sin Fricción**:
  - Datos de contacto del comprador.
  - Opciones de entrega (Retiro en taller, Envío a domicilio, A convenir).
  - Opciones de pago (Transferencia con datos precargados y copia rápida de Alias/CBU, Efectivo, A coordinar).
  - Generación de pedido inmutable en base de datos.
  - Envío automático de pedido formateado a **WhatsApp** del vendedor.

### 2. Panel de Administración del Maker (`/tienda/admin`)
- **Ventas & Pedidos (`/tienda/admin/ventas`)**:
  - Métricas en tiempo real: Facturación ($), Total de Pedidos, Pendientes y Clientes Únicos.
  - Filtros por estado: Nuevos, En Producción, Despachados, Entregados, Cancelados.
  - **Confirmar Venta y Descontar Stock**: Descuenta automáticamente el stock de productos y variantes en base de datos.
  - Cancelación de pedidos con restauración automática de stock.
  - Acceso directo para chatear por WhatsApp con el cliente.
- **Cobros & Transferencia (`/tienda/admin/pagos`)**:
  - Configuración de Alias, CBU/CVU, Banco, Titular y CUIT para copia rápida en el checkout.
- **Diseño & Paleta (`/tienda/admin/branding`)**:
  - 6 paletas de colores preset con cálculo de contraste WCAG AA.
  - Selección de tipografías Google Fonts.
  - Carga de Logotipo e Icono de marca.
- **Sobre Nosotros (`/tienda/admin/sobre-nosotros`)**:
  - Configuración opcional de historia del taller, valores y foto de máquinas/equipo.
- **Contacto & Ubicación (`/tienda/admin/contacto`)**:
  - Dirección física, mapa de Google Maps, horarios y redes sociales.
- **Gestión de Productos (`/tienda/admin/productos`)**:
  - Múltiples imágenes, variantes con sobreprecio/stock, categorías, tiempo estimado de producción.

---

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Correr servidor de desarrollo
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) en el navegador.

---

© Portalmaker — Todos los derechos reservados.
