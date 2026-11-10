import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantStore } from "@/lib/tenant";
import type { Store, HeaderSettings } from "@/types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StoreThemeSync from "./theme-sync";
import CartProviderClient from "./cart-provider-client";
import CustomerSync from "./customer-sync";
import { getTenantCSSVars } from "@/lib/color-utils";
import { isStoreCheckoutActive, isFeatureAllowed } from "@/lib/plans";
import {
  getRequestOrigin,
  getStoreDefaultDescription,
  getStoreDefaultTitle,
  getStoreShareImage,
} from "@/lib/store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantStore();
  if (!tenant) return {};

  const { store } = tenant;
  const storeIcon = store.favicon_url || store.icono_url || store.logo_url || "/logo.png";
  const origin = await getRequestOrigin();
  const title = getStoreDefaultTitle(store);
  const description = getStoreDefaultDescription(store);
  const shareImage = await getStoreShareImage(store);

  return {
    // metadataBase propio: sin esto, og:url e imágenes relativas se resolverían
    // contra portalmaker.ar (el metadataBase del layout raíz).
    metadataBase: new URL(origin),
    // absolute evita que la plantilla del portal ("%s | Portalmaker") se aplique
    // al título de la tienda; las páginas hijas usan la plantilla de la tienda.
    title: {
      absolute: title,
      template: `%s | ${store.nombre}`,
    },
    description,
    // Se anulan las keywords y la canonical del portal: heredadas, le decían a
    // Google que cada página de la tienda era un duplicado de portalmaker.ar.
    // No se fija una canonical acá porque el layout la heredaría a todas las
    // páginas hijas; cada página que la necesite define la suya.
    keywords: null,
    alternates: { canonical: null },
    // WhatsApp, Facebook y Telegram arman la vista previa con estas etiquetas.
    // Sin og:url: así cada página se comparte con su propia URL.
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: store.nombre,
      title,
      description,
      images: shareImage ? [{ url: shareImage, alt: store.nombre }] : [],
    },
    twitter: {
      card: shareImage ? "summary_large_image" : "summary",
      title,
      description,
      images: shareImage ? [shareImage] : [],
    },
    icons: {
      icon: [{ url: storeIcon }],
      shortcut: [{ url: storeIcon }],
      apple: [{ url: storeIcon }],
    },
  };
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
      <StoreThemeSync
        defaultTheme={store.tema_por_defecto}
        faviconUrl={store.favicon_url || store.icono_url || store.logo_url || "/logo.png"}
      />

      {/* Anota como cliente a quien inicia sesión, por cualquier camino */}
      <CustomerSync storeId={store.id} />

      {/* Google Analytics (validado contra formato oficial G-XXXX o UA-XXXX para prevenir XSS) */}
      {store.ga_measurement_id &&
        /^(G-[A-Z0-9]{4,16}|UA-\d{4,12}-\d{1,4})$/i.test(store.ga_measurement_id.trim()) &&
        isFeatureAllowed(store, 'analytics') && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(store.ga_measurement_id.trim())}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${store.ga_measurement_id.trim().replace(/[^a-zA-Z0-9-]/g, '')}');
                `,
              }}
            />
          </>
        )}

      {/* Meta Pixel (validado estrictamente como numérico para prevenir XSS) */}
      {store.meta_pixel_id &&
        /^\d{6,20}$/.test(store.meta_pixel_id.trim()) &&
        isFeatureAllowed(store, 'analytics') && (
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
                fbq('init', '${store.meta_pixel_id.trim().replace(/\D/g, '')}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}

      <CartProviderClient
        storeId={store.id}
        storeName={store.nombre}
        whatsappNumero={store.whatsapp_numero}
        checkoutActivo={isStoreCheckoutActive(store)}
        tenantQuery={tenantQuery}
        showFloatingWhatsapp={showFloatingWhatsapp}
      >
        {children}
      </CartProviderClient>
    </div>
  );
}
