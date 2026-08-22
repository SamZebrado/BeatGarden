import { describe, expect, it } from 'vitest';
import { resolveRootRoute } from '../src/app/routes';

describe('root mode routing', () => {
  it('boots mode select by default', () => {
    expect(resolveRootRoute('')).toEqual({ kind: 'modes' });
  });

  it('preserves every legacy screen query as Rhythm-owned', () => {
    expect(resolveRootRoute('?screen=firefly')).toEqual({ kind: 'rhythm' });
    expect(resolveRootRoute('?screen=autochart')).toEqual({ kind: 'rhythm' });
    expect(resolveRootRoute('?screen=unknown-old-link')).toEqual({ kind: 'rhythm' });
  });

  it('routes explicit modes and Running world', () => {
    expect(resolveRootRoute('?mode=rhythm')).toEqual({ kind: 'rhythm' });
    expect(resolveRootRoute('?mode=running')).toEqual({ kind: 'running', world: null, difficulty: 'garden' });
    expect(resolveRootRoute('?mode=running&world=phd&difficulty=sprout')).toEqual({ kind: 'running', world: 'phd', difficulty: 'sprout' });
    expect(resolveRootRoute('?mode=running&world=master&difficulty=storm')).toEqual({ kind: 'running', world: 'master', difficulty: 'storm' });
    expect(resolveRootRoute('?mode=running&world=work&difficulty=unknown')).toEqual({ kind: 'running', world: 'work', difficulty: 'garden' });
  });

  it('gives a legacy screen precedence over mode', () => {
    expect(resolveRootRoute('?mode=running&screen=firefly')).toEqual({ kind: 'rhythm' });
  });
});
