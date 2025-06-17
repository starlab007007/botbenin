
-- Add display_in_live_chat column to bots table
ALTER TABLE public.bots 
ADD COLUMN display_in_live_chat boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.bots.display_in_live_chat IS 'Whether this bot should be displayed in the live chat interface';

-- Update existing bots to have the default value
UPDATE public.bots 
SET display_in_live_chat = false 
WHERE display_in_live_chat IS NULL;
