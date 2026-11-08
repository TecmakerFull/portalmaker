-- Hora que la persona quería al anotarse en la lista de espera (opcional, "HH:MM" local).
-- La lista sigue siendo por día: se avisa a todos los que esperaban ese día. La hora
-- le sirve a la tienda para saber qué horario estaba buscando cada uno.
alter table public.booking_waitlist
  add column if not exists hora_preferida text
  check (hora_preferida is null or hora_preferida ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
