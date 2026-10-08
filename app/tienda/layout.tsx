import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantStore } from "@/lib/tenant";
import type { Store, HeaderSettings } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StoreThemeSync from "./theme-sync";
import CartProviderClient from "./cart-provider-client";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantStore();
  if (!tenant) return {};

  const { store } = tenant;
  const storeIcon = store.favicon_url || store.icono_url || store.logo_url || "/icon.svg";

  return {
    title: {
      default: `${store.nombre}${store.slogan ? ` — ${store.slogan}` : ""}`,
      template: `%s | ${store.nombre}`,
    },
    description: store.meta_description || store.slogan || `Catálogo oficial de ${store.nombre}`,
    icons: {
      icon: [{ url: storeIcon }],
      shortcut: [{ url: storeIcon }],
      apple: [{ url: storeIcon }],
    },
  };
}

function getTenantCSSVars(store: Store): React.CSSProperties {
  const fontHeading = store.font_heading?.toLowerCase().replace(/\s+/g, "-") || "inter";
  const fontBody = store.font_body?.toLowerCase().replace(/\s+/g, "-") || "inter";

  return {
    "--tenant-primario": store.color_primario,
    "--tenant-secundario": store.color_secundario,
    "--tenant-fondo": store.color_fondo,
    "--tenant-texto": store.color_texto,
    "--tenant-primario-dark": store.color_primario_dark || store.color_primario,
    "--tenant-secundario-dark": store.color_secundario_dark || store.color_secundario,
    "--tenant-fondo-dark": store.color_fondo_dark || "#111827",
    "--tenant-texto-dark": store.color_texto_dark || "#F9FAFB",
    "--font-heading": `var(--font-${fontHeading})`,
    "--font-body": `var(--font-${fontBody})`,
  } as React.CSSProperties;
}

export default async function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenantStore();

  if (!tenant) {
    notFound();
  }

  const { store, context } = tenant;
  const tenantQuery = context.resolved_by === "query-param-dev" ? `?tenant=${store.slug}` : "";
  const tenantStyles = getTenantCSSVars(store);

  // Obtener configuración de header para saber si el botón flotante está activo
  const supabase = await createSupabaseServerClient();
  const { data: headerSection } = await supabase
    .from("store_sections")
    .select("settings")
    .eq("store_id", store.id)
    .eq("section_type", "header")
    .maybeSingle();

  const headerSettings = headerSection?.settings as HeaderSettings | undefined;
  const showFloatingWhatsapp = headerSettings?.mostrar_whatsapp_flotante ?? true;

  return (
    <div
      className="tienda-root min-h-screen"
      style={tenantStyles}
      data-store-slug={store.slug}
    >
      <StoreThemeSync defaultTheme={store.tema_por_defecto} />

      {/* Google Analytics */}
      {store.ga_measurement_id && (
        <>
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

      {/* Meta Pixel */}
      {store.meta_pixel_id && (
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

      <CartProviderClient
        storeId={store.id}
        storeName={store.nombre}
        whatsappNumero={store.whatsapp_numero}
        tenantQuery={tenantQuery}
        showFloatingWhatsapp={showFloatingWhatsapp}
      >
        {children}
      </CartProviderClient>
    </div>
  );
}
