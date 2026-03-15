using BeSQL.Application.Common.Models;

namespace BeSQL.Application.Common.Interfaces;

/// <summary>
/// Compares two result sets and produces a structured diff.
/// </summary>
public interface IResultSetDiffEngine
{
    DiffResult Compare(ResultSetDto expected, ResultSetDto actual);
}
