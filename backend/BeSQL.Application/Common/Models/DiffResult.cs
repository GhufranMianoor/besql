namespace BeSQL.Application.Common.Models;

/// <summary>Structured diff between expected and actual result sets.</summary>
public sealed class DiffResult
{
    public bool              IsMatch        { get; init; }
    public int               ExpectedRows   { get; init; }
    public int               ActualRows     { get; init; }
    public List<string>      MissingColumns { get; init; } = [];
    public List<string>      ExtraColumns   { get; init; } = [];
    public List<RowDiff>     RowDiffs       { get; init; } = [];
    public List<string>      Warnings       { get; init; } = [];
}

public sealed class RowDiff
{
    public int              RowIndex { get; init; }
    public DiffKind         Kind     { get; init; }
    public List<CellDiff>   Cells    { get; init; } = [];
}

public sealed class CellDiff
{
    public string   Column   { get; init; } = string.Empty;
    public object?  Expected { get; init; }
    public object?  Actual   { get; init; }
}

public enum DiffKind { Match, Missing, Extra, Modified }
