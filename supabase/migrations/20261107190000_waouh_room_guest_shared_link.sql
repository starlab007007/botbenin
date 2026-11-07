-- Vendeur sans numéro : lien de contact partageable (sans téléphone) ; base « annonce publique » acceptée.
alter table public.waouh_room_guests alter column phone_encrypted drop not null;
alter table public.waouh_room_guests alter column phone_hash drop not null;
alter table public.waouh_room_guests drop constraint if exists waouh_room_guests_channel_check;
alter table public.waouh_room_guests add constraint waouh_room_guests_channel_check check (channel in ('whatsapp','link'));
alter table public.waouh_room_guests drop constraint if exists waouh_room_guests_consent_basis_check;
alter table public.waouh_room_guests add constraint waouh_room_guests_consent_basis_check
  check (consent_basis in ('partner','public_business','initiated','listing_owner','listing_contact','shared_link'));
