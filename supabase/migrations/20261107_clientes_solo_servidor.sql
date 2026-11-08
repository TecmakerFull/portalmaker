-- =============================================================================
-- Los clientes de una tienda (store_customers) solo se crean y editan desde el
-- servidor (/api/store/customer-sync y las rutas de reserva y checkout).
--
-- Antes, cualquier persona con sesión podía insertar o actualizar su propia fila
-- directo desde el navegador. Eso permitía saltear el tope de clientes del plan:
-- se anotaba sola y, como ya figuraba en la lista, el control de la reserva no la
-- frenaba. Con la actualización también podía mover su fila a otra tienda
-- cambiando store_id. Ahora solo dueño, administradores, colaboradores y
-- superadmin escriben; el cliente conserva la lectura de su propia fila.
-- =============================================================================

drop policy if exists "store_customers_insert" on store_customers;
create policy "store_customers_insert" on store_customers
  for insert to authenticated
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );

drop policy if exists "store_customers_update" on store_customers;
create policy "store_customers_update" on store_customers
  for update to authenticated
  using (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  )
  with check (
    is_platform_admin()
    or public.is_store_owner(store_id)
    or public.is_store_collaborator(store_id)
  );
