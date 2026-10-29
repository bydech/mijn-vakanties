-- Activeer RLS op expense_splits
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Verwijder eventuele oude policies
DROP POLICY IF EXISTS "Leden kunnen splits inzien" ON public.expense_splits;
DROP POLICY IF EXISTS "Leden kunnen splits toevoegen" ON public.expense_splits;
DROP POLICY IF EXISTS "Leden kunnen splits updaten" ON public.expense_splits;
DROP POLICY IF EXISTS "Leden kunnen splits verwijderen" ON public.expense_splits;

-- 1. SELECT Policy: Alle deelnemers van de bijbehorende reis mogen splits inzien
CREATE POLICY "Leden kunnen splits inzien"
ON public.expense_splits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    JOIN public.trip_members ON trip_members.trip_id = expenses.trip_id
    WHERE expenses.id = expense_splits.expense_id
    AND (
      trip_members.user_id = auth.uid()
      OR lower(trip_members.email) = lower(auth.jwt()->>'email')
    )
  )
);

-- 2. INSERT Policy: Leden van de trip mogen splits toevoegen
CREATE POLICY "Leden kunnen splits toevoegen"
ON public.expense_splits FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.expenses
    JOIN public.trip_members ON trip_members.trip_id = expenses.trip_id
    WHERE expenses.id = expense_splits.expense_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role IN ('admin', 'member')
  )
);

-- 3. UPDATE Policy
CREATE POLICY "Leden kunnen splits updaten"
ON public.expense_splits FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    JOIN public.trip_members ON trip_members.trip_id = expenses.trip_id
    WHERE expenses.id = expense_splits.expense_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role IN ('admin', 'member')
  )
);

-- 4. DELETE Policy
CREATE POLICY "Leden kunnen splits verwijderen"
ON public.expense_splits FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.expenses
    JOIN public.trip_members ON trip_members.trip_id = expenses.trip_id
    WHERE expenses.id = expense_splits.expense_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role IN ('admin', 'member')
  )
);