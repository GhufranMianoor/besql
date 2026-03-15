namespace BeSQL.Application.Common.Interfaces;

/// <summary>Wraps BCrypt password hashing.</summary>
public interface IPasswordHasher
{
    string Hash(string password);
    bool   Verify(string password, string hash);
}
