-- Initialize database with extensions and schemas
-- This script runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE student_coaching TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA app TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Add comments for documentation
COMMENT ON DATABASE student_coaching IS 'Öğrenci Koçluk Sistemi - Student Coaching Application Database';
