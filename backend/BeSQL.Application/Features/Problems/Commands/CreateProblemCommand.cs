using MediatR;
using BeSQL.Domain.Enums;

namespace BeSQL.Application.Features.Problems.Commands;

public sealed record CreateProblemCommand(
    string     Title,
    string     Description,
    Difficulty Difficulty,
    string     InitScript,
    string     GoldenSolution,
    List<string> Tags
) : IRequest<Guid>;
