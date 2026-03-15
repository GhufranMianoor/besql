/**
 * validator.js — Builds and runs answer-validation logic for problems.
 *
 * Each test case stored in a problem has a `validate` function that is
 * called with the SQL result object.  When problems are persisted to
 * localStorage the function is stripped; this module rebuilds it from
 * the problem's known-correct `solution` field.
 */
'use strict';

/**
 * Rebuild `validate` functions on all problems after loading from storage.
 * @param {Array} problems
 * @returns {Array} problems with validate functions restored
 */
function rebuildValidators(problems) {
  return problems.map(p => ({
    ...p,
    testCases: p.testCases.map(tc => ({
      ...tc,
      validate: buildValidator(tc, p),
    })),
  }));
}

/**
 * Build a validate function for a single test case.
 *
 * Strategy: run the canonical solution and compare row counts.  Individual
 * test cases may override this by providing an `expr` field (a serialised
 * predicate string) that is eval-ed — but for security we avoid eval and
 * instead rely on the validate functions defined inline in problems.js.
 *
 * @param {Object} tc   - test case descriptor
 * @param {Object} prob - parent problem
 * @returns {(result: Object) => boolean}
 */
function buildValidator(tc, prob) {
  return (result) => {
    if (result.error || !result.rows) return false;
    const ref = runSQL(prob.solution, DB);
    if (ref.error) return false;
    return result.rowCount === ref.rowCount;
  };
}

/**
 * Strip non-serialisable validate functions before persisting to storage.
 * @param {Array} problems
 * @returns {Array} serialisable problem array
 */
function stripValidators(problems) {
  return problems.map(p => {
    // eslint-disable-next-line no-unused-vars
    const { testCases, ...rest } = p;
    return {
      ...rest,
      testCases: testCases.map(tc => {
        // eslint-disable-next-line no-unused-vars
        const { validate, ...t } = tc;
        return t;
      }),
    };
  });
}
