namespace BeSQL.Application.Common.Interfaces;

/// <summary>Provides the identity of the currently authenticated user.</summary>
public interface ICurrentUserService
{
    Guid?   UserId   { get; }
    string? Username { get; }
    bool    IsAuthenticated { get; }
}
