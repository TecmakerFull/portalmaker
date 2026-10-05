// =============================================================================
// PORTALMAKER — Layout del route group (tienda)
// "El portal del Maker" | portalmaker.com.ar
//
// Este layout envuelve todas las páginas de las tiendas individuales:
//   - / (home/galería de productos)
//   - /productos/[slug] (página de producto)
//   - /[slug] (páginas informativas dinámicas)
//   - /admin/* (panel de administración de la tienda)
//
// RESPONSABILIDADES:
//   1. Resuelve el tenant: llama a getTenantStore() para obtener los datos
//      de la tienda según el header x-store-slug o x-store-domain
//      inyectado por el middleware.
//   2. Inyecta la paleta de colores del tenant como variables CSS en el <html>,
//      permitiendo que todos los componentes usen var(--color-primario) etc.
//   3. Inyecta los scripts de GA y Meta Pixel si el admin los configuró.
//   4. Muestra 404 si la tienda no existe o no está activa.
// =============================================================================

import { notFound } from "next/navigation";
import { getTenantStore } from "@/lib/tenant";
import type { Store } from "@/types/database";

// =============================================================================
// HELPER: Genera las variables CSS de color para un tenant
// Recibe los datos de la tienda y retorna un objeto de estilos inline
// que sobreescribe las variables CSS base definidas en globals.css.
// =============================================================================
function getTenantCSSVars(store: Store): React.CSSProperties {
  return {
    // Los valores oscuros pueden ser null si el admin usó color picker libre.
    // En ese caso, globals.css tiene los valores por defecto de la paleta Industrial,
    // que el algoritmo de modo oscuro puede sobreescribir en el cliente.
    "--color-primario":         store.color_primario,
    "--color-secundario":       store.color_secundario,
    "--color-fondo":            store.color_fondo,
    "--color-texto":            store.color_texto,
    "--color-primario-dark":    store.color_primario_dark ?? store.color_primario,
    "--color-secundario-dark":  store.color_secundario_dark ?? store.color_secundario,
    "--color-fondo-dark":       store.color_fondo_dark ?? "#1a1a1a",
    "--color-texto-dark":       store.color_texto_dark ?? "#f0f0f0",
    // Variables de fuente del tenant
    "--font-heading": `var(--font-${store.font_heading?.toLowerCase().replace(/\s+/g, "-") ?? "inter"})`,
    "--font-body":    `var(--font-${store.font_body?.toLowerCase().replace(/\s+/g, "-") ?? "inter"})`,
  } as React.CSSProperties;
}

export default async function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolver el tenant para este request.
  // Si la tienda no existe en la BD, next/navigation.notFound() renderiza el 404.
  const tenant = await getTenantStore();

  if (!tenant) {
    notFound();
  }

  const { store } = tenant;

  // Generar las variables CSS del tenant para inyectar en el contenedor raíz
  const tenantStyles = getTenantCSSVars(store);

  return (
    <>
      {/* ============================================================
          SCRIPTS DE ANALÍTICA (inyección automática si están configurados)
          Se inyectan en el <head> del documento via Next.js Script.
          Docs: https://nextjs.org/docs/app/api-reference/components/script
          ============================================================ */}
      {store.ga_measurement_id && (
        <>
          {/* Google Analytics */}
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${store.ga_measurement_id}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${store.ga_measurement_id}');
              `,
            }}
          />
        </>
      )}

      {store.meta_pixel_id && (
        /* Meta Pixel */
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${store.meta_pixel_id}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* ============================================================
          CONTENEDOR RAÍZ DE LA TIENDA
          Las variables CSS se inyectan aquí como estilos inline.
          Todos los componentes hijos heredan estas variables y las usan
          con var(--color-primario), var(--color-fondo), etc.
          ============================================================ */}
      <div
        className="tienda-root"
        style={tenantStyles}
        // data-store-slug permite identificar la tienda en el DOM (útil para debugging)
        data-store-slug={store.slug}
      >
        {children}
      </div>
    </>
  );
}
