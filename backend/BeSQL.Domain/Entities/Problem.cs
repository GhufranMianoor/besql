using BeSQL.Domain.Enums;

namespace BeSQL.Domain.Entities;

/// <summary>A SQL problem on the platform.</summary>
public sealed class Problem
{
    public Guid       Id             { get; set; } = Guid.NewGuid();
    public string     Title          { get; set; } = string.Empty;
    public string     Slug           { get; set; } = string.Empty;
    public string     Description    { get; set; } = string.Empty;
    public Difficulty Difficulty     { get; set; } = Difficulty.Easy;

    /// <summary>SQL DDL + seed script that creates the problem's schema.</summary>
    public string     InitScript     { get; set; } = string.Empty;

    /// <summary>The authoritative "golden" solution query.</summary>
    public string     GoldenSolution { get; set; } = string.Empty;

    /// <summary>JSON-serialised list of tags, e.g. ["JOIN","GROUP BY"].</summary>
    public string     Tags           { get; set; } = "[]";

    public int        AcceptCount    { get; set; }
    public int        SubmitCount    { get; set; }
    public bool       IsPublished    { get; set; }
    public Guid       AuthorId       { get; set; }
    public User?      Author         { get; set; }
    public int        Version        { get; set; } = 1;
    public DateTime   CreatedAt      { get; set; } = DateTime.UtcNow;
    public DateTime   UpdatedAt      { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Submission>    Submissions    { get; set; } = [];
    public ICollection<ContestProblem> ContestProblems { get; set; } = [];
    public ICollection<ProblemVersion> Versions       { get; set; } = [];
}
