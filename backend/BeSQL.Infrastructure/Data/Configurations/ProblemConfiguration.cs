using BeSQL.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BeSQL.Infrastructure.Data.Configurations;

public sealed class ProblemConfiguration : IEntityTypeConfiguration<Problem>
{
    public void Configure(EntityTypeBuilder<Problem> b)
    {
        b.HasKey(p => p.Id);
        b.HasIndex(p => p.Slug).IsUnique();
        b.Property(p => p.Title).HasMaxLength(200).IsRequired();
        b.Property(p => p.Slug).HasMaxLength(200).IsRequired();
        b.Property(p => p.Difficulty).HasConversion<string>();

        b.HasMany(p => p.Submissions)
            .WithOne(s => s.Problem)
            .HasForeignKey(s => s.ProblemId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasMany(p => p.Versions)
            .WithOne(v => v.Problem)
            .HasForeignKey(v => v.ProblemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
