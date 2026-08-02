
-- Vérifier et ajouter les colonnes manquantes à la table roles
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_system_role boolean DEFAULT false;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Mettre à jour les rôles existants avec des display_name appropriés
UPDATE public.roles SET display_name = 
  CASE 
    WHEN name = 'admin' THEN 'Administrateur'
    WHEN name = 'manager' THEN 'Manager'
    WHEN name = 'user' THEN 'Utilisateur'
    WHEN name = 'viewer' THEN 'Observateur'
    ELSE INITCAP(name)
  END
WHERE display_name IS NULL;

-- Rendre display_name NOT NULL après avoir défini les valeurs
ALTER TABLE public.roles ALTER COLUMN display_name SET NOT NULL;

-- Mettre à jour is_system_role pour les rôles par défaut
UPDATE public.roles SET is_system_role = true 
WHERE name IN ('admin', 'manager', 'user', 'viewer');
;
