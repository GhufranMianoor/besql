using BeSQL.Domain.Entities;

namespace BeSQL.Application.Common.Interfaces;

/// <summary>Manages JWT access tokens and refresh token rotation.</summary>
public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    Task<(string AccessToken, string NewRefreshToken)> RotateTokensAsync(
        string refreshToken,
        CancellationToken ct = default);
    Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken ct = default);
}
