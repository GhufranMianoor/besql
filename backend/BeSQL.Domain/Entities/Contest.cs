using BeSQL.Domain.Enums;

namespace BeSQL.Domain.Entities;

/// <summary>A timed SQL contest.</summary>
public sealed class Contest
{
    public Guid          Id           { get; set; } = Guid.NewGuid();
    public string        Title        { get; set; } = string.Empty;
    public string        Slug         { get; set; } = string.Empty;
    public string        Description  { get; set; } = string.Empty;
    public ContestStatus Status       { get; set; } = ContestStatus.Draft;
    public DateTime      StartTime    { get; set; }
    public DateTime      EndTime      { get; set; }
    public Guid          CreatedById  { get; set; }
    public User?         CreatedBy    { get; set; }
    public DateTime      CreatedAt    { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ContestProblem>     Problems      { get; set; } = [];
    public ICollection<ContestParticipant> Participants  { get; set; } = [];
    public ICollection<Submission>         Submissions   { get; set; } = [];
}
