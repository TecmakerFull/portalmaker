// =============================================================================
// PORTALMAKER — Layout del route group (portal)
// "El portal del Maker" | portalmaker.com.ar
//
// Este layout envuelve todas las páginas del portal de la plataforma:
//   - / (landing/marketing)
//   - /planes
//   - /contacto
//   - /dashboard/maker (panel del maker logueado)
//   - /dashboard/admin (panel del developer/superadmin)
//
// NO incluye las páginas de las tiendas individuales — esas van en (tienda).
//
// Nota sobre Next.js App Router y route groups:
//   Los paréntesis en "(portal)" crean un grupo que no aparece en la URL.
//   Todas las rutas dentro de esta carpeta son accesibles sin "/portal/" en la URL.
//   El middleware es quien decide que portalmaker.com.ar llega a este grupo.
// =============================================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  // Metadatos del portal (se sobreescriben página por página si hace falta)
  title: {
    default: "Portalmaker — El portal del Maker",
    template: "%s | Portalmaker",
  },
  description:
    "La plataforma e-commerce para talleres maker argentinos. Impresión 3D, grabado láser, corte láser.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Contenedor del portal con la paleta de colores del portal (no del tenant)
    // Los colores de la plataforma se definen en globals.css como paleta "Industrial"
    <div className="portal-root" style={{ fontFamily: "var(--font-portal-body)" }}>
      {children}
    </div>
  );
}
