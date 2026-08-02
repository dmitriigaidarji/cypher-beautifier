/**
 * Multi word clause openers, longest first. `matchClause` walks this list in
 * order, so `ON CREATE SET` is recognised before the bare `CREATE` that would
 * otherwise be pulled onto its own line.
 */
export const CLAUSE_SEQUENCES: string[][] = [
  ["LOAD", "CSV", "WITH", "HEADERS", "FROM"],
  ["USING", "PERIODIC", "COMMIT"],
  ["ON", "CREATE", "SET"],
  ["ON", "MATCH", "SET"],
  ["LOAD", "CSV", "FROM"],
  ["OPTIONAL", "MATCH"],
  ["DETACH", "DELETE"],
  ["NODETACH", "DELETE"],
  ["ORDER", "BY"],
  ["UNION", "ALL"],
  ["UNION", "DISTINCT"],
  ["USING", "INDEX"],
  ["USING", "SCAN"],
  ["USING", "JOIN"],
  ["ON", "CREATE"],
  ["ON", "MATCH"],
  ["MATCH"],
  ["MERGE"],
  ["CREATE"],
  ["INSERT"],
  ["RETURN"],
  ["WITH"],
  ["WHERE"],
  ["SET"],
  ["REMOVE"],
  ["DELETE"],
  ["SKIP"],
  ["OFFSET"],
  ["LIMIT"],
  ["UNWIND"],
  ["CALL"],
  ["UNION"],
  ["FOREACH"],
  ["USE"],
  ["FINISH"],
  ["NEXT"],
];

/** Clauses that read better with a blank line on either side. */
export const BLANK_LINE_CLAUSES = new Set([
  "UNION",
  "UNION ALL",
  "UNION DISTINCT",
]);

/** Clause openers that hang off the clause above them. */
export const INDENTED_CLAUSES = new Set([
  "ON CREATE",
  "ON MATCH",
  "ON CREATE SET",
  "ON MATCH SET",
  "USING INDEX",
  "USING SCAN",
  "USING JOIN",
]);

/**
 * Words rendered in the configured keyword case.
 *
 * Deliberately excludes function names (`count`, `range`, `type`, ...) — those
 * are recognised by the `(` that follows them and left alone.
 */
export const KEYWORDS = new Set([
  "ALL",
  "AND",
  "AS",
  "ASC",
  "ASCENDING",
  "BY",
  "CALL",
  "CASE",
  "COLLECT",
  "COMMIT",
  "CONSTRAINT",
  "CONTAINS",
  "COUNT",
  "CREATE",
  "CSV",
  "CYPHER",
  "DELETE",
  "DESC",
  "DESCENDING",
  "DETACH",
  "DISTINCT",
  "ELSE",
  "END",
  "ENDS",
  "EXISTS",
  "EXPLAIN",
  "FINISH",
  "FOREACH",
  "FROM",
  "HEADERS",
  "IN",
  "INDEX",
  "INSERT",
  "IS",
  "LIMIT",
  "LOAD",
  "MATCH",
  "MERGE",
  "NEXT",
  "NODETACH",
  "NOT",
  "NULL",
  "OFFSET",
  "ON",
  "OPTIONAL",
  "OR",
  "ORDER",
  "PERIODIC",
  "PROFILE",
  "REMOVE",
  "RETURN",
  "SCAN",
  "SET",
  "SKIP",
  "STARTS",
  "THEN",
  "TRANSACTIONS",
  "UNION",
  "UNWIND",
  "USE",
  "USING",
  "WHEN",
  "WHERE",
  "WITH",
  "XOR",
  "YIELD",
]);

/** Boolean connectives that get their own line when a condition is too long. */
export const BOOLEAN_OPERATORS = new Set(["AND", "OR", "XOR"]);

/** Statement prefixes that stay glued to the first clause of a query. */
export const QUERY_PREFIXES = new Set(["EXPLAIN", "PROFILE", "CYPHER"]);

/** Keywords whose `{ ... }` block holds clauses rather than a map literal. */
export const SUBQUERY_KEYWORDS = new Set([
  "CALL",
  "EXISTS",
  "COUNT",
  "COLLECT",
]);

/** Operators that glue two pattern elements together, e.g. `(a)-[r]->(b)`. */
export const PATTERN_CONNECTORS = new Set([
  "-",
  "--",
  "->",
  "<-",
  "-->",
  "<--",
]);
