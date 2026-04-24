/**
 * Escape user-supplied strings before they are interpolated into a PostgREST
 * filter DSL string — e.g. `query.or(`name.ilike.%${userInput}%,...`)` or
 * `query.ilike("name", `%${userInput}%`)`.
 *
 * PostgREST parameterizes filter VALUES safely on its own, so classic SQL
 * injection is not possible. Two real risks remain:
 *
 *   1. Wildcard expansion. `%` and `_` are `LIKE`/`ILIKE` wildcards. A user
 *      entering `%` as their search term would match every row, which is a
 *      result-set expansion (potential info disclosure beyond intent) and a
 *      DoS vector on large tables.
 *
 *   2. Clause injection in `.or()`. The `.or()` filter is a comma-separated
 *      DSL string. A user entering `foo,col.eq.x` inside an interpolated
 *      `.or()` could graft an extra OR clause onto the query. RLS still
 *      applies, but the intended filter is no longer the only filter.
 *
 * `escapeLike()` neutralizes both: it backslash-escapes `\`, `%`, `_`, and
 * additionally `,` / `.` / `(` / `)` which carry structural meaning inside the
 * PostgREST filter DSL. Callers should wrap every user-controlled string that
 * reaches `.or()` or an interpolated `.ilike()` pattern.
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_,.()*]/g, "\\$&");
}
