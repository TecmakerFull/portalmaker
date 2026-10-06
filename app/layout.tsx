// =============================================================================
// PORTALMAKER — Layout raíz de la aplicación
// "El portal del Maker" | portalmaker.com.ar
//
// Este es el layout de nivel más alto. Se aplica a TODAS las rutas,
// tanto del portal (portalmaker.com.ar) como de las tiendas individuales.
//
// Responsabilidades:
//   - Metadatos base de SEO (se sobreescriben en cada route group)
//   - Fuentes de Google Fonts (cargadas una sola vez)
//   - Proveedor de sesión de Supabase Auth
//   - Estructura HTML base (html, body)
// =============================================================================

import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display, Space_Grotesk, DM_Serif_Display } from "next/font/google";
import "./globals.css";

// ============================================================
// FUENTES DE GOOGLE FONTS
// Se cargan todas las fuentes disponibles para las tiendas aquí,
// para que CSS las pueda referenciar sin bloquear el render.
// Cada tienda elige su font_heading y font_body desde /admin/branding.
// ============================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",   // swap evita el flash de texto invisible durante la carga
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-display",
  display: "swap",
});

// ============================================================
// METADATOS BASE DEL PORTAL
// Cada página puede sobreescribir estos metadatos con su propio
// export const metadata o generateMetadata().
// ============================================================
export const metadata: Metadata = {
  title: {
    default: "Portalmaker — El portal del Maker",
    template: "%s | Portalmaker",
  },
  description: "La plataforma e-commerce para talleres maker. Impresión 3D, grabado láser, corte láser y más.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://portalmaker.com.ar"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('portalmaker-theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`
          ${inter.variable}
          ${outfit.variable}
          ${playfairDisplay.variable}
          ${spaceGrotesk.variable}
          ${dmSerifDisplay.variable}
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}
