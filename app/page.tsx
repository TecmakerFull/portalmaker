// =============================================================================
// PORTALMAKER — Página temporal (redirige al portal o a la tienda)
// "El portal del Maker" | portalmaker.com.ar
//
// Esta es la page.tsx raíz. En producción, el middleware ya resuelve
// a qué "mundo" pertenece el request antes de llegar aquí.
//
// Durante el desarrollo con `npm run dev`, sin subdominio configurado,
// esta página sirve de punto de entrada temporal.
//
// Se reemplazará por la landing del portal (Fase 5).
// =============================================================================

export default function RootPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        background: '#F5F4F1',
        color: '#202224',
      }}
    >
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Portalmaker
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B6B6B', marginBottom: '2rem' }}>
          El portal del Maker — en construcción
        </p>
        <p style={{ fontSize: '0.875rem', color: '#9A9A9A' }}>
          Para desarrollo: agregar <code>?tenant=slug</code> para simular una tienda
        </p>
      </div>
    </main>
  );
}
