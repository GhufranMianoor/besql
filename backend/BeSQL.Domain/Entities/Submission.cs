using BeSQL.Domain.Enums;

namespace BeSQL.Domain.Entities;

/// <summary>A user's query submission against a problem.</summary>
public sealed class Submission
{
    public Guid             Id              { get; set; } = Guid.NewGuid();
    public Guid             UserId          { get; set; }
    public User?            User            { get; set; }
    public Guid             ProblemId       { get; set; }
    public Problem?         Problem         { get; set; }
    public Guid?            ContestId       { get; set; }
    public Contest?         Contest         { get; set; }
    public string           QueryText       { get; set; } = string.Empty;
    public SubmissionStatus Status          { get; set; } = SubmissionStatus.Pending;

    /// <summary>Execution time in milliseconds.</summary>
    public double           ExecutionTimeMs { get; set; }

    /// <summary>PostgreSQL query cost from EXPLAIN ANALYZE.</summary>
    public double           QueryCost       { get; set; }

    /// <summary>JSON diff output from the ResultSetDiffEngine.</summary>
    public string?          DiffOutput      { get; set; }

    /// <summary>Raw error message for failed executions.</summary>
    public string?          ErrorMessage    { get; set; }

    /// <summary>True if plagiarism detection flagged this submission.</summary>
    public bool             IsFlagged       { get; set; }

    /// <summary>Score awarded (used in contest mode).</summary>
    public int              Score           { get; set; }

    public DateTime         SubmittedAt     { get; set; } = DateTime.UtcNow;
}
