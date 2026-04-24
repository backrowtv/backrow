import { describe, expect, it } from "vitest";
import { escapeLike } from "@/lib/security/postgrest-escape";

describe("escapeLike", () => {
  it("passes through plain alphanumeric input", () => {
    expect(escapeLike("hello")).toBe("hello");
    expect(escapeLike("The Godfather 1972")).toBe("The Godfather 1972");
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("%")).toBe("\\%");
    expect(escapeLike("_")).toBe("\\_");
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes first so double-escaping doesn't corrupt them", () => {
    expect(escapeLike("\\")).toBe("\\\\");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });

  it("escapes PostgREST .or() structural characters", () => {
    expect(escapeLike(",")).toBe("\\,");
    expect(escapeLike(".")).toBe("\\.");
    expect(escapeLike("(")).toBe("\\(");
    expect(escapeLike(")")).toBe("\\)");
    expect(escapeLike("*")).toBe("\\*");
  });

  it("neutralizes an attempted OR-clause injection", () => {
    // Attacker tries to append `,role.eq.admin` to an interpolated .or() filter.
    // Without escaping, this would graft an extra OR clause. With escaping, the
    // whole string is treated as a literal search term.
    const malicious = "x,role.eq.admin";
    expect(escapeLike(malicious)).toBe("x\\,role\\.eq\\.admin");
  });

  it("neutralizes an attempted wildcard expansion", () => {
    // Attacker enters `%` hoping to match every row.
    expect(escapeLike("%")).toBe("\\%");
  });

  it("handles empty string", () => {
    expect(escapeLike("")).toBe("");
  });

  it("is idempotent on already-escaped input at the character level", () => {
    // Second pass escapes the escaping backslash + the original metachar — this
    // is expected behavior, documented so future-me doesn't "optimize" it away.
    expect(escapeLike(escapeLike("%"))).toBe("\\\\\\%");
  });

  it("preserves whitespace and unicode", () => {
    expect(escapeLike("  hi  ")).toBe("  hi  ");
    expect(escapeLike("café")).toBe("café");
    expect(escapeLike("日本")).toBe("日本");
  });
});
