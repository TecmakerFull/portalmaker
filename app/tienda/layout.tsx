import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantStore } from "@/lib/tenant";
import type { Store, HeaderSettings } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StoreThemeSync from "./theme-sync";
import CartProviderClient from "./cart-provider-client";
import { getReadableTextColor, getAccessibleColorOnBg } from "@/lib/color-utils";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantStore();
  if (!tenant) return {};

  const { store } = tenant;
  const storeIcon = store.favicon_url || store.icono_url || store.logo_url || "/logo.png";

  return {
    title: {
      default: `${store.nombre}${store.slogan ? ` — ${store.slogan}` : ""}`,
      template: `%s | ${store.nombre}`,
    },
    description: store.meta_description || store.slogan || `Catálogo oficial de ${store.nombre}`,
    icons: {
      icon: [{ url: storeIcon }, { url: "/favicon.ico" }],
      shortcut: [{ url: storeIcon }],
      apple: [{ url: storeIcon }],
    },
  };
}

function getTenantCSSVars(store: Store): React.CSSProperties {
  const fontHeading = store.font_heading?.toLowerCase().replace(/\s+/g, "-") || "manrope";
  const fontBody = store.font_body?.toLowerCase().replace(/\s+/g, "-") || "dm-sans";

  const primarioLight = store.color_primario || "#FACC15";
  const fondoLight = store.color_fondo || "#FFFFFF";
  const secundarioLight = store.color_secundario || "#4B5563";

  const primarioDark = store.color_primario_dark || primarioLight;
  const fondoDark = store.color_fondo_dark || "#111827";
  const secundarioDark = store.color_secundario_dark || secundarioLight;

  // 1. Color de texto a colocar ENCIMA del color primario (ej: botones, badges)
  const primarioTextoLight = getReadableTextColor(primarioLight);
  const primarioTextoDark = getReadableTextColor(primarioDark);

  // 2. Color del primario cuando se usa como TEXTO o BORDE sobre fondo claro (garantiza ratio >= 4.5:1)
  const primarioLegibleLight = getAccessibleColorOnBg(primarioLight, fondoLight, 4.5);
  // En fondo oscuro, el primario suele ser claro/brillante, aseguramos legibilidad
  const primarioLegibleDark = getAccessibleColorOnBg(primarioDark, fondoDark, 4.5);

  // 3. Lo mismo para secundario
  const secundarioTextoLight = getReadableTextColor(secundarioLight);
  const secundarioTextoDark = getReadableTextColor(secundarioDark);
  const secundarioLegibleLight = getAccessibleColorOnBg(secundarioLight, fondoLight, 4.5);
  const secundarioLegibleDark = getAccessibleColorOnBg(secundarioDark, fondoDark, 4.5);

  return {
    "--tenant-primario": primarioLight,
    "--tenant-primario-texto": primarioTextoLight,
    "--tenant-primario-legible": primarioLegibleLight,
    "--tenant-secundario": secundarioLight,
    "--tenant-secundario-texto": secundarioTextoLight,
    "--tenant-secundario-legible": secundarioLegibleLight,
    "--tenant-fondo": fondoLight,
    "--tenant-texto": store.color_texto || "#111827",

    "--tenant-primario-dark": primarioDark,
    "--tenant-primario-dark-texto": primarioTextoDark,
    "--tenant-primario-dark-legible": primarioLegibleDark,
    "--tenant-secundario-dark": secundarioDark,
    "--tenant-secundario-dark-texto": secundarioTextoDark,
    "--tenant-secundario-dark-legible": secundarioLegibleDark,
    "--tenant-fondo-dark": fondoDark,
    "--tenant-texto-dark": store.color_texto_dark || "#F9FAFB",

    "--font-heading": `var(--font-${fontHeading}, var(--font-manrope))`,
    "--font-body": `var(--font-${fontBody}, var(--font-dm-sans))`,
    "--font-display": `var(--font-${fontHeading}, var(--font-manrope))`,
    "--font-sans": `var(--font-${fontBody}, var(--font-dm-sans))`,
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
