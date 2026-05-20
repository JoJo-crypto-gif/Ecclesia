-- Migration: Add landmark, whatsapp, and spouse_church to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(15),
ADD COLUMN IF NOT EXISTS spouse_church VARCHAR(255);
