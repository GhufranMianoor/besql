-- =============================================================
-- BeSQL  |  Migration 003  —  Helper Functions (SQL Judge)
-- =============================================================

-- Executes arbitrary SQL — used by the judge to set up test schemas
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Runs a SELECT in an isolated schema and returns rows as JSONB
CREATE OR REPLACE FUNCTION run_query(schema_name text, sql_query text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result jsonb;
BEGIN
  EXECUTE format('SET LOCAL search_path TO %I', schema_name);
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t'
  INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Increments user points and problem count after an accepted submission
CREATE OR REPLACE FUNCTION increment_user_stats(
  p_user_id    uuid,
  p_score      int,
  p_problem_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_profiles
  SET
    points          = points + p_score,
    problems_solved = problems_solved + 1
  WHERE user_id = p_user_id;
END;
$$;
