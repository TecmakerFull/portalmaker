-- =============================================================================
-- PORTALMAKER — Migración de Seguridad: columnas de plan y Storage de medios
-- Fecha: 2026-11-06
--
-- 1. protect_store_sensitive_columns: además de las columnas ya protegidas,
--    impide que un dueño o colaborador cambie desde el navegador su plan,
--    límite de productos, overrides de funcionalidades y modo de operación.
--    Antes, un dueño podía ejecutar `update stores set plan='enterprise'` con
--    el cliente de Supabase y obtener gratis funciones pagas (dominio propio,
--    couriers, productos ilimitados). Solo el superadmin edita estas columnas
--    (desde /dashboard/admin) y el service_role sigue pasando sin restricción.
--
-- 2. portalmaker-media: las políticas de insert/update/delete no tenían rol ni
--    verificación de pertenencia, así que cualquier visitante (incluso anónimo)
--    podía subir, sobrescribir o borrar imágenes de cualquier tienda. Ahora solo
--    puede escribir el dueño, un colaborador activo de la tienda dueña de la
--    carpeta, o un superadmin. La lectura pública se mantiene.
--    Convenciones de ruta usadas por el panel:
--      tiendas/{store_id}/...   (productos, branding, páginas)
--      {store_id}/...           (banners)
--
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger de columnas protegidas en STORES
-- -----------------------------------------------------------------------------
create or replace function protect_store_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_superadmin boolean := false;
  v_cliente_cambio_verified boolean := false;
begin
  -- Dejar pasar a service_role, postgres y supabase_admin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' then
    return new;
  end if;

  v_is_superadmin := is_platform_admin();

  -- (a) Calcular ANTES de alterar ningún campo si el cliente intentó cambiar custom_domain_verified
  v_cliente_cambio_verified := (old.custom_domain_verified is distinct from new.custom_domain_verified);

  -- (b) Si no es superadmin y pretendió cambiar custom_domain_verified -> Rechazar
  if not v_is_superadmin and v_cliente_cambio_verified then
    raise exception 'No tienes permisos para modificar custom_domain_verified';
  end if;

  -- (c) Si cambió custom_domain y custom_domain_verified no fue enviado deliberadamente como true por superadmin,
  -- forzar verificación a false (el nuevo dominio debe ser verificado)
  if old.custom_domain is distinct from new.custom_domain then
    if not (v_is_superadmin and new.custom_domain_verified = true) then
      new.custom_domain_verified := false;
    end if;
  end if;

  -- Para cualquier rol que NO sea superadmin:
  if not v_is_superadmin then
    if old.comision_portalmaker is distinct from new.comision_portalmaker then
      raise exception 'No tienes permisos para modificar comision_portalmaker';
    end if;
    if old.suscripcion_activa is distinct from new.suscripcion_activa then
      raise exception 'No tienes permisos para modificar suscripcion_activa';
    end if;
    if old.slug is distinct from new.slug then
      raise exception 'El subdominio (slug) solo puede ser modificado mediante el flujo administrativo verificado';
    end if;
    if old.admin_email is distinct from new.admin_email then
      raise exception 'El email del administrador solo puede ser modificado mediante el flujo de verificación de identidad';
    end if;
    if old.estado_pago is distinct from new.estado_pago then
      raise exception 'No tienes permisos para modificar el estado_pago de la suscripción';
    end if;
    if old.fecha_proximo_vencimiento is distinct from new.fecha_proximo_vencimiento then
      raise exception 'No tienes permisos para modificar la fecha_proximo_vencimiento';
    end if;
    if old.dias_gracia is distinct from new.dias_gracia then
      raise exception 'No tienes permisos para modificar los dias_gracia';
    end if;
    if old.notas_admin is distinct from new.notas_admin then
      raise exception 'Las notas de administración son exclusivas del equipo del portal';
    end if;
    if old.mp_connected is distinct from new.mp_connected then
      raise exception 'El estado de conexión de Mercado Pago solo puede modificarse mediante el flujo seguro de OAuth';
    end if;
    if new.mp_recargo_porcentaje is not null and (new.mp_recargo_porcentaje < 0 or new.mp_recargo_porcentaje > 15) then
      raise exception 'El recargo por Mercado Pago debe estar entre 0%% y 15%%';
    end if;

    -- Restauradas/nuevas (2026-11-06): columnas que definen qué paga y qué obtiene
    -- la tienda. plan, precio_mensual y limite_productos estaban protegidas en la
    -- versión original de schema.sql y se perdieron al recrear la función en la
    -- migración 20261021_mercadopago_ronda7.
    if old.plan is distinct from new.plan then
      raise exception 'El plan solo puede ser modificado por el equipo del portal';
    end if;
    if old.precio_mensual is distinct from new.precio_mensual then
      raise exception 'El precio mensual solo puede ser modificado por el equipo del portal';
    end if;
    if old.limite_productos is distinct from new.limite_productos then
      raise exception 'El límite de productos solo puede ser modificado por el equipo del portal';
    end if;
    if old.features_override is distinct from new.features_override then
      raise exception 'Las funcionalidades habilitadas solo pueden ser modificadas por el equipo del portal';
    end if;
    if old.modo_operacion is distinct from new.modo_operacion then
      raise exception 'El modo de operación depende del plan y solo lo modifica el equipo del portal';
    end if;
    if old.checkout_activo is distinct from new.checkout_activo then
      raise exception 'La activación del checkout depende del plan y solo la modifica el equipo del portal';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_store_columns on stores;
create trigger trg_protect_store_columns
  before update on stores
  for each row
  execute function protect_store_sensitive_columns();

-- -----------------------------------------------------------------------------
-- 2. Storage: escritura en portalmaker-media solo para miembros de la tienda
-- -----------------------------------------------------------------------------
create or replace function public.can_write_store_media(p_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_parts text[] := storage.foldername(p_name);
  v_store text;
begin
  if is_platform_admin() then
    return true;
  end if;

  if v_parts is null or array_length(v_parts, 1) is null then
    return false;
  end if;

  if v_parts[1] = 'tiendas' then
    v_store := v_parts[2];
  else
    v_store := v_parts[1];
  end if;

  -- Validar formato antes del cast para que una ruta arbitraria no genere error.
  if v_store is null or v_store !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.is_store_owner(v_store::uuid) or public.is_store_collaborator(v_store::uuid);
end;
$$;

revoke all on function public.can_write_store_media(text) from public, anon;
grant execute on function public.can_write_store_media(text) to authenticated, service_role;

drop policy if exists "authenticated_insert_media" on storage.objects;
drop policy if exists "authenticated_update_media" on storage.objects;
drop policy if exists "authenticated_delete_media" on storage.objects;

create policy "authenticated_insert_media" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));

create policy "authenticated_update_media" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'portalmaker-media' and public.can_write_store_media(name))
  with check (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));

create policy "authenticated_delete_media" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'portalmaker-media' and public.can_write_store_media(name));
