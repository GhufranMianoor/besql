using BeSQL.Domain.Enums;

namespace BeSQL.Application.Common.Models;

/// <summary>Full output of a judged submission.</summary>
public sealed class ExecutionResult
{
    public SubmissionStatus Status          { get; init; }
    public double           ExecutionTimeMs { get; init; }
    public double           QueryCost       { get; init; }
    public ResultSetDto?    UserResult      { get; init; }
    public ResultSetDto?    GoldenResult    { get; init; }
    public DiffResult?      Diff            { get; init; }
    public string?          ErrorMessage    { get; init; }
}
