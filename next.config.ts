// =============================================================================
// PORTALMAKER — Configuración de Next.js
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import type { NextConfig } from "next";

// Forzar polling para evitar el error EISDIR en unidades de red / WSL / Samba en Windows
if (process.env.NODE_ENV !== 'production') {
  process.env.WATCHPACK_POLLING = 'true';
  process.env.CHOKIDAR_USEPOLLING = '1';
}

const nextConfig: NextConfig = {
  // ============================================================
  // CLOUDFLARE PAGES COMPATIBILITY
  // El middleware usa el Edge Runtime de Cloudflare.
  // @cloudflare/next-on-pages (o OpenNext) lo requiere.
  // ============================================================

  // Optimización de imágenes — deshabilitada para Cloudflare Pages
  // (el worker de Edge no soporta el optimizador de imágenes de Next.js).
  // Las imágenes de Supabase Storage se sirven directamente desde su CDN.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        // Permitir imágenes de Supabase Storage
        // El hostname exacto varía por proyecto (xxxxxxxxxxx.supabase.co)
        // En producción, usar el dominio exacto del proyecto Supabase.
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ============================================================
  // TYPESCRIPT Y ESLINT
  // En CI/CD (Cloudflare Pages build) queremos que los errores
  // detengan el deploy para no publicar código roto.
  // ============================================================
  typescript: {
    // Durante desarrollo se puede ignorar temporalmente,
    // pero en producción debe ser false.
    ignoreBuildErrors: false,
  },
  webpack: (config, { dev }) => {
    config.resolve.symlinks = false;
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
