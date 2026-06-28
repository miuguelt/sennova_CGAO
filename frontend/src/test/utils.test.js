import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (classNames utility)', () => {
  it('combines multiple class names', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('filters falsy values', () => {
    expect(cn(['foo', false, 'bar', null, undefined, 0, ''])).toBe('foo bar');
  });

  it('returns empty string for no inputs', () => {
    expect(cn([])).toBe('');
  });

  it('works with single class', () => {
    expect(cn(['only'])).toBe('only');
  });
});
