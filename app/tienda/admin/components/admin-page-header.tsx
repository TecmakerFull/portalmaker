// =============================================================================
// PORTALMAKER — Encabezado Estandarizado para Páginas del Panel Admin
// Mantiene consistencia visual (estilo tarjeta con ícono, título y descripción)
// en todos los menús de administración de la tienda.
// =============================================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs text-[var(--color-texto)] ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)] truncate">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {description && (
              <p className="text-xs sm:text-sm opacity-70 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

export default AdminPageHeader;
