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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icon.png" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://portalmaker.ar/#website",
      "url": "https://portalmaker.ar",
      "name": "Portalmaker",
      "description": "La plataforma e-commerce para talleres maker argentinos.",
      "inLanguage": "es-AR",
    },
    {
      "@type": "Organization",
      "@id": "https://portalmaker.ar/#organization",
      "name": "Portalmaker",
      "url": "https://portalmaker.ar",
      "logo": {
        "@type": "ImageObject",
        "url": "https://portalmaker.ar/logo.png",
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+5493415866464",
        "contactType": "customer service",
        "areaServed": "AR",
        "availableLanguage": "es",
      },
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </div>
  );
}
