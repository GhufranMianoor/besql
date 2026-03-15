namespace BeSQL.Application.Common.Models;

/// <summary>A tabular result set returned by a SQL query.</summary>
public sealed class ResultSetDto
{
    public List<string>         Columns { get; init; } = [];
    public List<List<object?>>  Rows    { get; init; } = [];
    public int                  RowCount => Rows.Count;
}
