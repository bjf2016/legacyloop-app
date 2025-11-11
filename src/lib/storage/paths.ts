export function basename(p: string) {
  return p.replace(/^\/+/, '').split('/').pop() || '';
}

export function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .join('/');
}
