DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (schemaname, tablename) IN (
      ('mart', 'mart_demand_plan'),
      ('mart', 'mart_replenishment_plan'),
      ('mart', 'mart_lead_time_analysis'),
      ('mart', 'mart_model_performance')
    )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      target.policyname,
      target.schemaname,
      target.tablename
    );
  END LOOP;
END $$;

ALTER TABLE mart.mart_demand_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_replenishment_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_lead_time_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.mart_model_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_mart_read" ON mart.mart_demand_plan FOR SELECT USING (true);
CREATE POLICY "public_mart_read" ON mart.mart_replenishment_plan FOR SELECT USING (true);
CREATE POLICY "public_mart_read" ON mart.mart_lead_time_analysis FOR SELECT USING (true);
CREATE POLICY "public_mart_read" ON mart.mart_model_performance FOR SELECT USING (true);

CREATE POLICY "admin_full_access" ON mart.mart_demand_plan
  FOR ALL USING (COALESCE(auth.jwt() ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_replenishment_plan
  FOR ALL USING (COALESCE(auth.jwt() ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_lead_time_analysis
  FOR ALL USING (COALESCE(auth.jwt() ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_full_access" ON mart.mart_model_performance
  FOR ALL USING (COALESCE(auth.jwt() ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
