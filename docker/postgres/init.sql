-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Performance optimizations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- Logging for development
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Apply settings
SELECT pg_reload_conf();

-- Create initial schema placeholder
CREATE SCHEMA IF NOT EXISTS axon;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA axon TO axon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA axon TO axon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA axon TO axon;

-- Add comment
COMMENT ON SCHEMA axon IS 'Axon Flow main application schema';