import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://fywvhroguzyyvnbulewd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5d3Zocm9ndXp5eXZuYnVsZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTg1MjQsImV4cCI6MjA4ODg5NDUyNH0.NvtypQUWUTlxAHE5M-JFoAj8rUqbEGPSHw90u61Z4F8";

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
