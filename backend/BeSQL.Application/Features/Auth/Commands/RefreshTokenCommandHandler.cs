using BeSQL.Application.Common.Interfaces;
using MediatR;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed class RefreshTokenCommandHandler(ITokenService tokenService)
    : IRequestHandler<RefreshTokenCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RefreshTokenCommand req, CancellationToken ct)
    {
        var (accessToken, newRefreshToken) =
            await tokenService.RotateTokensAsync(req.RefreshToken, ct);

        return new AuthResult(accessToken, newRefreshToken, string.Empty, string.Empty);
    }
}
