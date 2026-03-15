using MediatR;
using BeSQL.Domain.Enums;

namespace BeSQL.Application.Features.Contests.Commands;

public sealed record CreateContestCommand(
    string   Title,
    string   Description,
    DateTime StartTime,
    DateTime EndTime,
    List<Guid> ProblemIds
) : IRequest<Guid>;
