ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS paid_from_pot boolean DEFAULT false;