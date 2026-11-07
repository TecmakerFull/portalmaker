-- =============================================================================
-- Toda tienda nueva arranca en el plan Free.
-- Antes el default era 'maker_pro', y una tienda creada por su dueño quedaba con
-- ese plan sin pagar. El plan solo lo cambia el superadmin (o, a futuro, el
-- webhook que confirma un pago por Mercado Pago, que corre con service_role).
-- =============================================================================

alter table stores alter column plan set default 'free';
alter table stores alter column limite_productos set default 15;

-- Defensa en el INSERT: el trigger de columnas protegidas solo corre en UPDATE,
-- así que un dueño podía mandar plan/comisión/checkout propios al crear la tienda.
-- Para cualquiera que no sea superadmin o service_role se fuerzan los valores iniciales.
create or replace function force_store_initial_values()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or
     (auth.jwt() ->> 'role') = 'service_role' or
     auth.role() = 'service_role' or
     is_platform_admin() then
    return new;
  end if;

  new.plan := 'free';
  new.precio_mensual := 0;
  new.limite_productos := 15;
  new.features_override := '{}'::jsonb;
  new.modo_operacion := 'vitrina';
  new.checkout_activo := false;
  new.comision_portalmaker := 0;
  new.estado_pago := 'al_dia';
  new.suscripcion_activa := true;
  new.fecha_proximo_vencimiento := null;
  new.dias_gracia := 3;
  new.notas_admin := null;
  new.mp_connected := false;
  new.custom_domain_verified := false;
  return new;
end;
$$;

drop trigger if exists trg_force_store_initial_values on stores;
create trigger trg_force_store_initial_values
  before insert on stores
  for each row
  execute function force_store_initial_values();
