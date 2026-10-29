-- Zorg ervoor dat zowel de maker als de groepsleden / beheerders uitgaven mogen bijwerken
DROP POLICY IF EXISTS "Leden kunnen uitgaven updaten" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses" ON public.expenses;

CREATE POLICY "Uitgaven bijwerken"
ON public.expenses FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = expenses.trip_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role IN ('admin', 'member')
    AND trip_members.status = 'accepted'
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = expenses.trip_id
    AND trip_members.user_id = auth.uid()
    AND trip_members.role IN ('admin', 'member')
    AND trip_members.status = 'accepted'
  )
);