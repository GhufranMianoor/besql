using BeSQL.Application.Common.Interfaces;
using BeSQL.Application.Common.Models;

namespace BeSQL.Infrastructure.Services;

/// <summary>
/// Compares two result sets produced by a user's query and the golden solution.
/// The comparison is ORDER-INDEPENDENT: rows are sorted before comparison so
/// that queries producing the same data in a different order are accepted.
/// </summary>
public sealed class ResultSetDiffEngine : IResultSetDiffEngine
{
    public DiffResult Compare(ResultSetDto expected, ResultSetDto actual)
    {
        // ── Column check ────────────────────────────────────────────────
        var missingCols = expected.Columns.Except(actual.Columns, StringComparer.OrdinalIgnoreCase).ToList();
        var extraCols   = actual.Columns.Except(expected.Columns, StringComparer.OrdinalIgnoreCase).ToList();

        if (missingCols.Count > 0 || extraCols.Count > 0)
        {
            return new DiffResult
            {
                IsMatch        = false,
                ExpectedRows   = expected.RowCount,
                ActualRows     = actual.RowCount,
                MissingColumns = missingCols,
                ExtraColumns   = extraCols,
                Warnings       = ["Column set does not match the expected output."],
            };
        }

        // ── Row count check ─────────────────────────────────────────────
        if (expected.RowCount != actual.RowCount)
        {
            return new DiffResult
            {
                IsMatch      = false,
                ExpectedRows = expected.RowCount,
                ActualRows   = actual.RowCount,
                Warnings     = [$"Expected {expected.RowCount} rows but got {actual.RowCount}."],
            };
        }

        // ── Normalise column order so we compare the same columns ───────
        var commonCols = expected.Columns
            .Where(c => actual.Columns.Contains(c, StringComparer.OrdinalIgnoreCase))
            .ToList();

        var expectedIdx = commonCols.Select(c =>
            expected.Columns.FindIndex(x => x.Equals(c, StringComparison.OrdinalIgnoreCase))).ToList();
        var actualIdx   = commonCols.Select(c =>
            actual.Columns.FindIndex(x => x.Equals(c, StringComparison.OrdinalIgnoreCase))).ToList();

        // ── Sort both result sets by all columns (order-independent) ────
        var sortedExpected = SortRows(expected.Rows, expectedIdx);
        var sortedActual   = SortRows(actual.Rows, actualIdx);

        // ── Row-by-row comparison ────────────────────────────────────────
        var rowDiffs = new List<RowDiff>();

        for (int r = 0; r < sortedExpected.Count; r++)
        {
            var expRow = sortedExpected[r];
            var actRow = sortedActual[r];
            var cellDiffs = new List<CellDiff>();

            for (int c = 0; c < commonCols.Count; c++)
            {
                var expVal = expRow[expectedIdx[c]];
                var actVal = actRow[actualIdx[c]];

                if (!ValuesEqual(expVal, actVal))
                {
                    cellDiffs.Add(new CellDiff
                    {
                        Column   = commonCols[c],
                        Expected = expVal,
                        Actual   = actVal,
                    });
                }
            }

            if (cellDiffs.Count > 0)
            {
                rowDiffs.Add(new RowDiff
                {
                    RowIndex = r,
                    Kind     = DiffKind.Modified,
                    Cells    = cellDiffs,
                });
            }
        }

        return new DiffResult
        {
            IsMatch      = rowDiffs.Count == 0,
            ExpectedRows = expected.RowCount,
            ActualRows   = actual.RowCount,
            RowDiffs     = rowDiffs,
        };
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────

    private static List<List<object?>> SortRows(List<List<object?>> rows, List<int> colIndices)
    {
        return [.. rows.OrderBy(row => BuildSortKey(row, colIndices))];
    }

    private static string BuildSortKey(List<object?> row, List<int> colIndices) =>
        string.Join("\u001F", colIndices.Select(i => row[i]?.ToString() ?? "\0"));

    private static bool ValuesEqual(object? a, object? b)
    {
        if (a is null && b is null) return true;
        if (a is null || b is null) return false;

        // Numeric tolerance for floating-point columns
        if (a is double da && b is double db)
            return Math.Abs(da - db) < 1e-9;
        if (a is float fa && b is float fb)
            return Math.Abs(fa - fb) < 1e-6f;
        if (a is decimal ma && b is decimal mb)
            return ma == mb;

        // Normalise to string for cross-type comparisons (e.g. int vs long)
        return string.Equals(
            a.ToString(), b.ToString(), StringComparison.OrdinalIgnoreCase);
    }
}
