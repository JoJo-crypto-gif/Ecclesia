-- Migration: Add discovery_source for demographic tracking
-- Description: Tracking how members discovered the church

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(50);
