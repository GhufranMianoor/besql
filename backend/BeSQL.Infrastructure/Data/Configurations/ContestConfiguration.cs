using BeSQL.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BeSQL.Infrastructure.Data.Configurations;

public sealed class ContestConfiguration : IEntityTypeConfiguration<Contest>
{
    public void Configure(EntityTypeBuilder<Contest> b)
    {
        b.HasKey(c => c.Id);
        b.HasIndex(c => c.Slug).IsUnique();
        b.Property(c => c.Status).HasConversion<string>();
    }
}

public sealed class ContestProblemConfiguration : IEntityTypeConfiguration<ContestProblem>
{
    public void Configure(EntityTypeBuilder<ContestProblem> b)
    {
        b.HasKey(cp => new { cp.ContestId, cp.ProblemId });
    }
}

public sealed class ContestParticipantConfiguration : IEntityTypeConfiguration<ContestParticipant>
{
    public void Configure(EntityTypeBuilder<ContestParticipant> b)
    {
        b.HasKey(cp => new { cp.ContestId, cp.UserId });
    }
}
