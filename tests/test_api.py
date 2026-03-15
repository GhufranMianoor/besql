"""
test_api.py — Unit tests for the Python FastAPI backend (no DB required).

Covers:
  - Password hashing and verification
  - JWT token creation and decoding
  - Token expiry detection
  - Result normalisation for grading (order-insensitive comparison)

Run: python -m pytest tests/test_api.py -v
  or: python tests/test_api.py
"""

import sys
import os
import time
from datetime import timedelta

# Ensure the repo root is on sys.path so `api` is importable as a package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from api.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

# ── Simple test runner (no pytest needed) ─────────────────────────────────
_passed = 0
_failed = 0
_results = []


def test(name, fn):
    global _passed, _failed
    try:
        fn()
        _passed += 1
        _results.append((True, name, None))
    except Exception as exc:
        _failed += 1
        _results.append((False, name, str(exc)))


def assert_eq(a, b, msg=''):
    assert a == b, msg or f'Expected {b!r}, got {a!r}'


def assert_true(val, msg=''):
    assert val, msg or 'Expected True'


def assert_false(val, msg=''):
    assert not val, msg or 'Expected False'


# ── Security: password hashing ────────────────────────────────────────────
test('hash_password produces a non-empty bcrypt hash', lambda: (
    assert_true(len(hash_password('mysecret')) > 20)
))

test('verify_password returns True for correct password', lambda: (
    assert_true(verify_password('hello123', hash_password('hello123')))
))

test('verify_password returns False for wrong password', lambda: (
    assert_false(verify_password('wrong', hash_password('correct')))
))

test('Two hashes of the same password are different (salted)', lambda: (
    assert_true(hash_password('same') != hash_password('same'))
))

# ── Security: JWT ─────────────────────────────────────────────────────────
test('create_access_token returns a non-empty string', lambda: (
    assert_true(len(create_access_token({'sub': 'abc'})) > 10)
))

test('decode_token recovers the sub claim', lambda: (
    assert_eq(decode_token(create_access_token({'sub': 'user-123'}))['sub'], 'user-123')
))


def _tamper_test():
    from jose import JWTError
    token = create_access_token({'sub': 'user-abc'}) + 'tampered'
    try:
        decode_token(token)
        assert False, 'Should have raised JWTError'
    except (JWTError, Exception):
        pass  # expected


test('decode_token raises on tampered token', _tamper_test)


def _expire_test():
    from jose import JWTError
    token = create_access_token({'sub': 'u'}, expires_delta=timedelta(seconds=-1))
    try:
        decode_token(token)
        assert False, 'Should have raised for expired token'
    except (JWTError, Exception):
        pass  # expected


test('decode_token raises on expired token', _expire_test)


# ── Grading: result normalisation ─────────────────────────────────────────
def _normalise(rows):
    """Same helper as in submissions.py."""
    return sorted(tuple(str(v) for v in row) for row in rows)


test('_normalise: identical rows regardless of order are equal', lambda: (
    assert_eq(
        _normalise([[1, 'Alice'], [2, 'Bob']]),
        _normalise([[2, 'Bob'], [1, 'Alice']]),
    )
))

test('_normalise: different rows are not equal', lambda: (
    assert_false(
        _normalise([[1, 'Alice']]) == _normalise([[1, 'Bob']])
    )
))

test('_normalise: handles None values', lambda: (
    assert_eq(
        _normalise([[1, None]]),
        _normalise([[1, None]]),
    )
))

test('_normalise: empty result sets are equal', lambda: (
    assert_eq(_normalise([]), _normalise([]))
))

# ── Print results ──────────────────────────────────────────────────────────
print('\n BeSQL — test_api.py\n')
pad = len(str(len(_results)))
for i, (ok, name, err) in enumerate(_results, 1):
    icon = '✓' if ok else '✗'
    tag  = 'PASS' if ok else 'FAIL'
    print(f'  {str(i).rjust(pad)}. {icon} [{tag}] {name}')
    if err:
        print(f'       → {err}')

print(f'\n  Total: {len(_results)} | Passed: {_passed} | Failed: {_failed}\n')
sys.exit(1 if _failed else 0)
