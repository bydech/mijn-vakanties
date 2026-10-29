-- 1. Voorkom het verwijderen van een trip_member als deze in expense_splits staat
ALTER TABLE public.expense_splits
DROP CONSTRAINT IF EXISTS expense_splits_member_id_fkey,
ADD CONSTRAINT expense_splits_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES public.trip_members(id)
  ON DELETE RESTRICT;

-- 2. Voorkom het verwijderen van een trip_member als deze een uitgave heeft voorgeschoten
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_paid_by_member_id_fkey,
ADD CONSTRAINT expenses_paid_by_member_id_fkey
  FOREIGN KEY (paid_by_member_id)
  REFERENCES public.trip_members(id)
  ON DELETE RESTRICT;