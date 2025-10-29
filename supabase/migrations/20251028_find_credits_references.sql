-- Find all database objects that reference the dropped 'credits' table

-- 1. Find all functions that reference 'credits'
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%credits%'
  AND n.nspname = 'public';

-- 2. Find all triggers that reference 'credits'
SELECT
    trigger_schema,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE action_statement ILIKE '%credits%'
  AND trigger_schema = 'public';

-- 3. Find all views that reference 'credits'
SELECT
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE view_definition ILIKE '%credits%'
  AND table_schema = 'public';
