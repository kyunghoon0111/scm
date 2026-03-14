-- =============================================================
-- 15_public_settings_read.sql
-- Public read access for non-sensitive upload/settings reference tables
-- =============================================================

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (schemaname, tablename) IN (
      ('ops', 'column_mappings'),
      ('ops', 'charge_type_config'),
      ('ops', 'threshold_config'),
      ('ops', 'coverage_policy_config')
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

ALTER TABLE ops.column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.charge_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.threshold_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.coverage_policy_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON ops.column_mappings
  FOR SELECT USING (true);
CREATE POLICY "settings_public_read" ON ops.charge_type_config
  FOR SELECT USING (true);
CREATE POLICY "settings_public_read" ON ops.threshold_config
  FOR SELECT USING (true);
CREATE POLICY "settings_public_read" ON ops.coverage_policy_config
  FOR SELECT USING (true);

CREATE POLICY "settings_write" ON ops.column_mappings
  FOR ALL USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY "settings_write" ON ops.charge_type_config
  FOR ALL USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY "settings_write" ON ops.threshold_config
  FOR ALL USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY "settings_write" ON ops.coverage_policy_config
  FOR ALL USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');
