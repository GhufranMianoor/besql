using BeSQL.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Common.Interfaces;

/// <summary>Abstraction over EF Core DbContext for testability.</summary>
public interface IApplicationDbContext
{
    DbSet<User>                Users                { get; }
    DbSet<Problem>             Problems             { get; }
    DbSet<Submission>          Submissions          { get; }
    DbSet<Contest>             Contests             { get; }
    DbSet<ContestProblem>      ContestProblems      { get; }
    DbSet<ContestParticipant>  ContestParticipants  { get; }
    DbSet<ProblemVersion>      ProblemVersions      { get; }
    DbSet<RefreshToken>        RefreshTokens        { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
