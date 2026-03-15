using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Infrastructure.Data;

/// <summary>EF Core DbContext backed by PostgreSQL.</summary>
public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User>               Users               => Set<User>();
    public DbSet<Problem>            Problems            => Set<Problem>();
    public DbSet<Submission>         Submissions         => Set<Submission>();
    public DbSet<Contest>            Contests            => Set<Contest>();
    public DbSet<ContestProblem>     ContestProblems     => Set<ContestProblem>();
    public DbSet<ContestParticipant> ContestParticipants => Set<ContestParticipant>();
    public DbSet<ProblemVersion>     ProblemVersions     => Set<ProblemVersion>();
    public DbSet<RefreshToken>       RefreshTokens       => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
