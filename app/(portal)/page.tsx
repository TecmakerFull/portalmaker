// =============================================================================
// PORTALMAKER — Landing page del portal
// "El portal del Maker" | portalmaker.com.ar
//
// Esta es la página principal del portal de Portalmaker.
// Lo que ve un visitante que llega a portalmaker.com.ar sin estar logueado.
//
// ESTADO ACTUAL: Placeholder. La landing completa se construye en Fase 5.
// Por ahora muestra la estructura básica para que el middleware y el routing
// funcionen correctamente.
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portalmaker — El portal del Maker",
  description:
    "La plataforma e-commerce para talleres maker argentinos. Tu tienda online lista en minutos.",
};

export default function PortalHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-fondo)",
        color: "var(--color-texto)",
      }}
    >
      {/* ===== HEADER TEMPORAL ===== */}
      <header
        style={{
          padding: "1.25rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-borde)",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: "1.125rem" }}>Portalmaker</span>
          <span style={{ color: "var(--color-secundario)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
            El portal del Maker
          </span>
        </div>
        <Link
          href="/login"
          style={{
            background: "var(--color-primario)",
            color: "#fff",
            padding: "0.5rem 1.25rem",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Ingresar
        </Link>
      </header>

      {/* ===== HERO TEMPORAL ===== */}
      <section
        style={{
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "6rem 2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: "1.5rem",
          }}
        >
          Tu tienda maker,{" "}
          <span style={{ color: "var(--color-primario)" }}>lista en minutos</span>
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "var(--color-secundario)",
            maxWidth: "40rem",
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          La plataforma e-commerce pensada para talleres de impresión 3D, grabado
          láser y corte láser en Argentina.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/planes"
            style={{
              background: "var(--color-primario)",
              color: "#fff",
              padding: "0.875rem 2rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "1rem",
              display: "inline-block",
            }}
          >
            Ver planes
          </Link>
          <Link
            href="/contacto"
            style={{
              border: "2px solid var(--color-primario)",
              color: "var(--color-primario)",
              padding: "0.875rem 2rem",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "1rem",
              display: "inline-block",
            }}
          >
            Consultar
          </Link>
        </div>
      </section>

      {/* ===== FOOTER TEMPORAL ===== */}
      <footer
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "var(--color-secundario)",
          fontSize: "0.875rem",
          borderTop: "1px solid var(--color-borde)",
        }}
      >
        Portalmaker {new Date().getFullYear()} — El portal del Maker
      </footer>
    </main>
  );
}
