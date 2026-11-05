-- #12 Scarce role alerts: the roles you want to hear about when someone nearby joins
-- ("Drums", "Bass", ...). NULL means you haven't picked yet; the app suggests drums and
-- bass if you said you're starting or rebuilding a band.
alter table public.profiles add column if not exists alert_roles text[];
alter table public.profiles drop constraint if exists profiles_alert_roles_size;
alter table public.profiles add constraint profiles_alert_roles_size check (alert_roles is null or cardinality(alert_roles) <= 10);
