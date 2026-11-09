'use client'

import { useState } from 'react'
import { Store, Layers, History } from 'lucide-react'
import SuperadminTiendasList, { type SuperadminStoreItem } from './tiendas-list'
import PlanesConfigManager from './planes-config-manager'
import AuditLogViewer from './audit-log-viewer'

interface Props {
  initialStores: SuperadminStoreItem[]
}

export default function SuperadminDashboardTabs({ initialStores }: Props) {
  const [activeTab, setActiveTab] = useState<'tiendas' | 'planes' | 'auditoria'>('tiendas')

  return (
    <div className="space-y-6">
      {/* Navegación por pestañas */}
      <div className="flex items-center gap-2 border-b border-[var(--color-borde)] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tiendas')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tiendas'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Cuentas y Tiendas ({initialStores.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('planes')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'planes'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configuración de Planes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('auditoria')}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'auditoria'
              ? 'bg-[#FF5500] text-white shadow-xs'
              : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registro de Auditoría</span>
        </button>
      </div>

      {/* Contenido de cada pestaña */}
      {activeTab === 'tiendas' && <SuperadminTiendasList initialStores={initialStores} />}
      {activeTab === 'planes' && <PlanesConfigManager />}
      {activeTab === 'auditoria' && <AuditLogViewer />}
    </div>
  )
}
