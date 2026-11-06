// =============================================================================
// PORTALMAKER — Configuración de Next.js
// portalmaker.com.ar | Desplegado en Vercel
// =============================================================================

import type { NextConfig } from "next";

// Forzar polling para evitar el error EISDIR en unidades de red / WSL / Samba en Windows
process.env.WATCHPACK_POLLING = 'true';
process.env.CHOKIDAR_USEPOLLING = '1';

// Headers de seguridad aplicados a todas las respuestas (portal y tiendas).
// - nosniff: evita que el navegador "adivine" tipos MIME (p. ej. ejecutar una imagen como script).
// - Referrer-Policy: no filtra rutas completas (con tokens de seguimiento/pedido) a sitios externos.
// - X-Frame-Options SAMEORIGIN: impide que un tercero embeba el panel admin para clickjacking;
//   hoy ningún flujo embebe páginas propias desde otro origen.
// - Permissions-Policy: la app no usa cámara, micrófono ni geolocalización; se desactivan.
//   Si un módulo futuro (p. ej. turnos con ubicación) los necesita, habilitarlo aquí.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Las imágenes de Supabase Storage se sirven directamente desde su CDN
  // (ya se comprimen en el cliente antes de subirlas), sin el optimizador de Next.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        // El hostname exacto varía por proyecto (xxxxxxxxxxx.supabase.co)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  // Los errores de tipos detienen el build en Vercel para no publicar código roto.
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
