using MediatR;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResult>;
