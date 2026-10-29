-- ==============================================================================
-- 1. EXPENSES: UPDATE POLICY TOEVOEGEN
-- ==============================================================================
-- Leden van de reis mogen uitgaven bijwerken
CREATE POLICY "Leden kunnen uitgaven bijwerken"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = expenses.trip_id
        AND trip_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = expenses.trip_id
        AND trip_members.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 2. TRIP_MEMBERS: UPDATE POLICY TOEVOEGEN (ROL WIJZIGEN)
-- ==============================================================================
-- Alleen reisbeheerders mogen rollen van leden aanpassen
CREATE POLICY "Beheerders kunnen lidrollen aanpassen"
  ON public.trip_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members AS tm
      WHERE tm.trip_id = trip_members.trip_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members AS tm
      WHERE tm.trip_id = trip_members.trip_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- ==============================================================================
-- 3. TRIPS: DELETE POLICY TOEVOEGEN
-- ==============================================================================
-- Alleen de maker of een admin mag een reis verwijderen
CREATE POLICY "Beheerder of maker kan reis verwijderen"
  ON public.trips
  FOR DELETE
  TO authenticated
  USING (
    trips.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trips.id
        AND trip_members.user_id = auth.uid()
        AND trip_members.role = 'admin'
    )
  );