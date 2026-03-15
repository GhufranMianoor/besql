using MediatR;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed record RegisterCommand(
    string Username,
    string Email,
    string Password
) : IRequest<AuthResult>;

public sealed record AuthResult(
    string AccessToken,
    string RefreshToken,
    string Username,
    string Role
);
