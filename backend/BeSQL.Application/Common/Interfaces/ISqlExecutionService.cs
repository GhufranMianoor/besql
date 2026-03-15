using BeSQL.Application.Common.Models;

namespace BeSQL.Application.Common.Interfaces;

/// <summary>
/// Runs a user query inside an isolated, transient schema and
/// returns the result set together with performance metrics.
/// </summary>
public interface ISqlExecutionService
{
    /// <summary>
    /// Execute <paramref name="userQuery"/> in a sandboxed environment
    /// built from <paramref name="initScript"/>, then compare the result
    /// against the output of <paramref name="goldenQuery"/>.
    /// </summary>
    Task<ExecutionResult> ExecuteAndJudgeAsync(
        string initScript,
        string userQuery,
        string goldenQuery,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute a raw SQL statement and return the result set (used by
    /// the editor's "Run" button — not judged).
    /// </summary>
    Task<ResultSetDto> RunQueryAsync(
        string initScript,
        string query,
        CancellationToken cancellationToken = default);
}
