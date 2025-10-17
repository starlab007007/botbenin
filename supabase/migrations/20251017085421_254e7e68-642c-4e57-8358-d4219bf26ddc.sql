-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XOF',
  phone_number text NOT NULL,
  full_name text,
  plan_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method text NOT NULL CHECK (payment_method IN ('mtn_momo', 'moov_money', 'sbin')),
  operator text NOT NULL CHECK (operator IN ('MTN', 'MOOV', 'SBIN')),
  qosic_transaction_id text,
  qosic_response jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_transactions_updated_at();

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update transaction status (for webhooks/callbacks)
CREATE POLICY "System can update transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (user_has_permission(auth.uid(), 'platform.admin'::text));