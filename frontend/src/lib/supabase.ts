import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase env vars are required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 스키마별 Supabase 쿼리 빌더.
 * Supabase 대시보드에서 mart, core, ops 스키마를 Exposed Schemas에 추가 필요:
 * Settings → API → Schema → 추가: mart, core, ops
 */
export function fromMart(table: string) {
  return supabase.schema("mart").from(table);
}

export function fromOps(table: string) {
  return supabase.schema("ops").from(table);
}

export function fromCore(table: string) {
  return supabase.schema("core").from(table);
}

export function fromRaw(table: string) {
  return supabase.schema("raw").from(table);
}
