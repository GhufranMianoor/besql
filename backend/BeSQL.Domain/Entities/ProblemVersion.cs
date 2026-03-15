namespace BeSQL.Domain.Entities;

/// <summary>Immutable snapshot of a problem at a specific version.</summary>
public sealed class ProblemVersion
{
    public int      Id           { get; set; }
    public Guid     ProblemId    { get; set; }
    public Problem? Problem      { get; set; }
    public int      Version      { get; set; }
    public string   Title        { get; set; } = string.Empty;
    public string   Description  { get; set; } = string.Empty;
    public string   InitScript   { get; set; } = string.Empty;
    public string   GoldenSolution { get; set; } = string.Empty;
    public Guid     ChangedById  { get; set; }
    public string   ChangeNote   { get; set; } = string.Empty;
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
}
