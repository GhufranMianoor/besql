namespace BeSQL.Domain.Entities;

/// <summary>Many-to-many join between a Contest and its Problems.</summary>
public sealed class ContestProblem
{
    public Guid     ContestId { get; set; }
    public Contest? Contest   { get; set; }
    public Guid     ProblemId { get; set; }
    public Problem? Problem   { get; set; }

    /// <summary>Display order within the contest.</summary>
    public int      Order     { get; set; }

    /// <summary>Points awarded for a correct solution in this contest.</summary>
    public int      Points    { get; set; } = 100;
}
