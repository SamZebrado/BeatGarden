export type RootRoute =
  | { kind: 'modes' }
  | { kind: 'rhythm' }
  | { kind: 'running'; world: string | null; difficulty: 'sprout' | 'garden' | 'storm' };

export function resolveRootRoute(search: string): RootRoute {
  const params = new URLSearchParams(search);
  if (params.has('screen')) return { kind: 'rhythm' };
  if (params.get('mode') === 'rhythm') return { kind: 'rhythm' };
  if (params.get('mode') === 'running') {
    const requested = params.get('difficulty');
    const difficulty = requested === 'sprout' || requested === 'storm' ? requested : 'garden';
    return { kind: 'running', world: params.get('world'), difficulty };
  }
  return { kind: 'modes' };
}

export function routeSearch(route: RootRoute): string {
  if (route.kind === 'rhythm') return '?mode=rhythm';
  if (route.kind === 'running') {
    const params = new URLSearchParams({ mode: 'running' });
    if (route.world) params.set('world', route.world);
    if (route.difficulty !== 'garden') params.set('difficulty', route.difficulty);
    return `?${params.toString()}`;
  }
  return window.location.pathname;
}
