// Drizzle wraps driver errors in DrizzleQueryError and carries the original pg error as
// `cause`, so the Postgres error code is one level down; some paths (raw pool queries)
// surface the pg error directly. Check both shapes.
export function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
  return code === '23505';
}
