-- =============================================================
-- 01_create_schemas.sql
-- Supabase PostgreSQL: 스키마 및 확장 생성
-- 기존 DuckDB 4계층 스키마 구조 그대로 유지
-- =============================================================

-- 4계층 스키마
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS mart;
CREATE SCHEMA IF NOT EXISTS ops;

-- pgcrypto 확장 (sha256 대체용: encode(digest(col::bytea,'sha256'),'hex'))
CREATE EXTENSION IF NOT EXISTS pgcrypto;
