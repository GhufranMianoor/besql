using BeSQL.Application.Common.Interfaces;
using BeSQL.Application.Common.Models;
using BeSQL.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace BeSQL.Infrastructure.Services;

/// <summary>
/// Executes user SQL queries inside an ephemeral, Docker-isolated PostgreSQL
/// schema.  Each submission gets a unique schema that is created, used and
/// then dropped — ensuring complete isolation between users.
/// </summary>
public sealed class SqlExecutionService : ISqlExecutionService
{
    private readonly IOptions<SqlExecutionOptions> _opts;
    private readonly IResultSetDiffEngine          _diffEngine;
    private readonly ILogger<SqlExecutionService>  _logger;

    public SqlExecutionService(
        IOptions<SqlExecutionOptions> opts,
        IResultSetDiffEngine          diffEngine,
        ILogger<SqlExecutionService>  logger)
    {
        _opts       = opts;
        _diffEngine = diffEngine;
        _logger     = logger;
    }
    private static readonly Regex SelectStarPattern =
        new(@"\bSELECT\s+\*\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // ──────────────────────────────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────────────────────────────

    public async Task<ExecutionResult> ExecuteAndJudgeAsync(
        string initScript,
        string userQuery,
        string goldenQuery,
        CancellationToken ct = default)
    {
        // Reject non-SELECT statements immediately (security guard)
        if (!IsSafeSelectQuery(userQuery))
        {
            return new ExecutionResult
            {
                Status       = SubmissionStatus.RuntimeError,
                ErrorMessage = "Only SELECT statements are allowed.",
            };
        }

        var schemaName = $"sandbox_{Guid.NewGuid():N}";
        await using var conn = await OpenConnectionAsync(ct);

        try
        {
            // 1. Create an isolated schema and run the problem's init script
            await BootstrapSchemaAsync(conn, schemaName, initScript, ct);

            // 2. Run the golden solution and capture its result
            var goldenResult = await RunInSchemaAsync(conn, schemaName, goldenQuery, ct);

            // 3. Run the user query, measuring time and cost
            var sw = Stopwatch.StartNew();
            var (userResult, queryCost) = await RunWithExplainAsync(conn, schemaName, userQuery, ct);
            sw.Stop();

            // 4. Diff the two result sets
            var diff = _diffEngine.Compare(goldenResult, userResult);

            // 5. Warn if SELECT * is used
            var warnings = new List<string>(diff.Warnings);
            if (SelectStarPattern.IsMatch(userQuery))
                warnings.Add("Avoid SELECT *: explicitly list required columns.");

            var finalDiff = new DiffResult
            {
                IsMatch        = diff.IsMatch,
                ExpectedRows   = diff.ExpectedRows,
                ActualRows     = diff.ActualRows,
                MissingColumns = diff.MissingColumns,
                ExtraColumns   = diff.ExtraColumns,
                RowDiffs       = diff.RowDiffs,
                Warnings       = warnings,
            };

            return new ExecutionResult
            {
                Status          = diff.IsMatch ? SubmissionStatus.Accepted : SubmissionStatus.WrongAnswer,
                ExecutionTimeMs = sw.Elapsed.TotalMilliseconds,
                QueryCost       = queryCost,
                UserResult      = userResult,
                GoldenResult    = goldenResult,
                Diff            = finalDiff,
            };
        }
        catch (NpgsqlException ex) when (IsTimeoutException(ex))
        {
            _logger.LogWarning("Query timed out for schema {Schema}", schemaName);
            return new ExecutionResult
            {
                Status       = SubmissionStatus.TimeLimitExceeded,
                ErrorMessage = "Query exceeded the time limit.",
            };
        }
        catch (NpgsqlException ex)
        {
            _logger.LogWarning(ex, "SQL error for schema {Schema}", schemaName);
            return new ExecutionResult
            {
                Status       = SubmissionStatus.RuntimeError,
                ErrorMessage = SanitizeError(ex.Message),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error for schema {Schema}", schemaName);
            return new ExecutionResult
            {
                Status       = SubmissionStatus.RuntimeError,
                ErrorMessage = "An unexpected error occurred.",
            };
        }
        finally
        {
            // 6. Always drop the sandbox schema
            await DropSchemaAsync(conn, schemaName, ct);
        }
    }

    public async Task<ResultSetDto> RunQueryAsync(
        string initScript,
        string query,
        CancellationToken ct = default)
    {
        if (!IsSafeSelectQuery(query))
            throw new InvalidOperationException("Only SELECT statements are permitted in the editor.");

        var schemaName = $"sandbox_{Guid.NewGuid():N}";
        await using var conn = await OpenConnectionAsync(ct);

        try
        {
            await BootstrapSchemaAsync(conn, schemaName, initScript, ct);
            return await RunInSchemaAsync(conn, schemaName, query, ct);
        }
        finally
        {
            await DropSchemaAsync(conn, schemaName, ct);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────

    private async Task<NpgsqlConnection> OpenConnectionAsync(CancellationToken ct)
    {
        var conn = new NpgsqlConnection(_opts.Value.SandboxConnectionString);
        await conn.OpenAsync(ct);
        return conn;
    }

    private static async Task BootstrapSchemaAsync(
        NpgsqlConnection conn,
        string           schemaName,
        string           initScript,
        CancellationToken ct)
    {
        // Create schema
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = $"CREATE SCHEMA \"{schemaName}\";";
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Set search_path so the init script creates tables inside the sandbox
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = $"SET search_path TO \"{schemaName}\", public;";
            await cmd.ExecuteNonQueryAsync(ct);
        }

        // Run the problem's DDL + seed script
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText    = initScript;
            cmd.CommandTimeout = 30;
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task<ResultSetDto> RunInSchemaAsync(
        NpgsqlConnection conn,
        string           schemaName,
        string           query,
        CancellationToken ct)
    {
        // Scope query to sandbox schema
        await using var setPath = conn.CreateCommand();
        setPath.CommandText = $"SET search_path TO \"{schemaName}\", public;";
        await setPath.ExecuteNonQueryAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText    = query;
        cmd.CommandTimeout = 10; // 10-second per-query limit

        await using var reader = await cmd.ExecuteReaderAsync(ct);

        var columns = Enumerable.Range(0, reader.FieldCount)
                                .Select(reader.GetName)
                                .ToList();
        var rows = new List<List<object?>>();

        while (await reader.ReadAsync(ct))
        {
            var row = new List<object?>(reader.FieldCount);
            for (int i = 0; i < reader.FieldCount; i++)
                row.Add(reader.IsDBNull(i) ? null : reader.GetValue(i));
            rows.Add(row);
        }

        return new ResultSetDto { Columns = columns, Rows = rows };
    }

    /// <summary>
    /// Runs the query prefixed with EXPLAIN (ANALYZE, FORMAT JSON) to capture
    /// the PostgreSQL query planner cost, then executes the actual query.
    /// </summary>
    private static async Task<(ResultSetDto Result, double Cost)> RunWithExplainAsync(
        NpgsqlConnection conn,
        string           schemaName,
        string           query,
        CancellationToken ct)
    {
        // Set schema scope
        await using (var setPath = conn.CreateCommand())
        {
            setPath.CommandText = $"SET search_path TO \"{schemaName}\", public;";
            await setPath.ExecuteNonQueryAsync(ct);
        }

        // EXPLAIN ANALYZE to get query cost
        double totalCost = 0;
        try
        {
            await using var explainCmd = conn.CreateCommand();
            explainCmd.CommandText    = $"EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS) {query}";
            explainCmd.CommandTimeout = 15;

            var explainJson = (string?)await explainCmd.ExecuteScalarAsync(ct);
            if (explainJson is not null)
            {
                // Parse the top-level "Total Cost" from the JSON plan
                using var doc = System.Text.Json.JsonDocument.Parse(explainJson);
                totalCost = doc.RootElement[0]
                              .GetProperty("Plan")
                              .GetProperty("Total Cost")
                              .GetDouble();
            }
        }
        catch
        {
            // EXPLAIN failure is non-fatal; cost stays 0
        }

        // Actual result
        var result = await RunInSchemaAsync(conn, schemaName, query, ct);
        return (result, totalCost);
    }

    private async Task DropSchemaAsync(
        NpgsqlConnection conn,
        string           schemaName,
        CancellationToken ct)
    {
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"DROP SCHEMA IF EXISTS \"{schemaName}\" CASCADE;";
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch (Exception ex)
        {
            // Log but don't rethrow — cleanup failure should not mask the real result
            _logger.LogWarning(ex, "Failed to drop sandbox schema {SchemaName}", schemaName);
        }
    }

    /// <summary>
    /// Validates that the query starts with SELECT and contains no forbidden
    /// DDL/DML keywords.  This is a defence-in-depth guard; the primary
    /// isolation is provided by the restricted PostgreSQL role.
    /// </summary>
    private static bool IsSafeSelectQuery(string query)
    {
        var trimmed = query.TrimStart();
        if (!trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)
            && !trimmed.StartsWith("WITH", StringComparison.OrdinalIgnoreCase))
            return false;

        // Block DML / DDL even inside CTEs
        var forbidden = new[] { "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE" };
        var upper     = query.ToUpperInvariant();
        foreach (var kw in forbidden)
        {
            // Simple word-boundary check
            var idx = upper.IndexOf(kw, StringComparison.Ordinal);
            if (idx < 0) continue;

            bool prevOk = idx == 0 || !char.IsLetterOrDigit(upper[idx - 1]);
            bool nextOk = idx + kw.Length >= upper.Length || !char.IsLetterOrDigit(upper[idx + kw.Length]);
            if (prevOk && nextOk) return false;
        }
        return true;
    }

    private static bool IsTimeoutException(NpgsqlException ex) =>
        ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) ||
        ex.SqlState == "57014"; // query_canceled

    /// <summary>Remove internal schema name from user-visible error messages.</summary>
    private static string SanitizeError(string message) =>
        Regex.Replace(message, @"sandbox_[0-9a-f]{32}", "<sandbox>",
                      RegexOptions.IgnoreCase);
}

// ──────────────────────────────────────────────────────────────────────────
// Configuration POCO
// ──────────────────────────────────────────────────────────────────────────

public sealed class SqlExecutionOptions
{
    public const string SectionName = "SqlExecution";

    /// <summary>
    /// Connection string for the sandboxed PostgreSQL role.
    /// This role must have CREATE SCHEMA privileges but must NOT be a
    /// superuser — it should be restricted to the sandbox database only.
    /// </summary>
    public string SandboxConnectionString { get; set; } = string.Empty;
}
