using MediatR;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed record LoginCommand(
    string Username,
    string Password
) : IRequest<AuthResult>;
