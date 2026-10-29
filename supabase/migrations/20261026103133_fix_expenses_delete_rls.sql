-- 1. Zorg ervoor dat splits automatisch meeverwijderd worden (ON DELETE CASCADE)
ALTER TABLE public.expense_splits
DROP CONSTRAINT IF EXISTS expense_splits_expense_id_fkey,
ADD CONSTRAINT expense_splits_expense_id_fkey
  FOREIGN KEY (expense_id)
  REFERENCES public.expenses(id)
  ON DELETE CASCADE;

-- 2. DELETE Policy voor expenses
-- Toegestaan als:
-- a) De gebruiker de uitgave zelf heeft aangemaakt (created_by), OF
-- b) De gebruiker beheerder/admin is van de betreffende reis (via is_trip_admin of trip_members)
DROP POLICY IF EXISTS "Leden kunnen uitgaven verwijderen" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses" ON public.expenses;

CREATE POLICY "Uitgaven verwijderen"
ON public.expenses FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = expenses.trip_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
    AND trips.created_by = auth.uid()
  )
);