-- Table pour stocker les logs des emails de qualification
CREATE TABLE IF NOT EXISTS public.qualification_emails (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    bot_link TEXT NOT NULL,
    contact_name TEXT,
    company_name TEXT,
    sender_info TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'opened', 'clicked')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_qualification_emails_recipient ON public.qualification_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_qualification_emails_status ON public.qualification_emails(status);
CREATE INDEX IF NOT EXISTS idx_qualification_emails_sent_at ON public.qualification_emails(sent_at);

-- Enable Row Level Security
ALTER TABLE public.qualification_emails ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion (edge function)
CREATE POLICY "Allow insert qualification emails" 
ON public.qualification_emails 
FOR INSERT 
WITH CHECK (true);

-- Politique pour permettre la lecture (utilisateurs authentifiés)
CREATE POLICY "Allow read qualification emails" 
ON public.qualification_emails 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Politique pour permettre la mise à jour du statut
CREATE POLICY "Allow update qualification emails status" 
ON public.qualification_emails 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_qualification_emails_updated_at
    BEFORE UPDATE ON public.qualification_emails
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();