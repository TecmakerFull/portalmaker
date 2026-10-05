import { getTenantStore } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function TiendaPage() {
  const tenant = await getTenantStore();

  if (!tenant) {
    notFound();
  }

  const { store } = tenant;

  return (
    <div className="min-h-screen p-8 bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)]">
      <header className="max-w-5xl mx-auto py-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-[var(--font-heading)] text-[var(--color-primario)]">
            {store.nombre}
          </h1>
          {store.slogan && (
            <p className="text-sm opacity-80 mt-1">{store.slogan}</p>
          )}
        </div>
        {store.whatsapp_numero && (
          <a
            href={`https://wa.me/${store.whatsapp_numero}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-[var(--color-primario)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Contacto WhatsApp
          </a>
        )}
      </header>

      <main className="max-w-5xl mx-auto py-12">
        <div className="text-center py-16 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/10 dark:border-white/10">
          <h2 className="text-2xl font-semibold mb-2">Catálogo de Productos</h2>
          <p className="text-sm opacity-70">
            Próximamente mostraremos los productos disponibles aquí.
          </p>
        </div>
      </main>
    </div>
  );
}
