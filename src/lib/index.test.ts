import { describe, expect, test } from "vitest";
import beautifyCypher from "./index.ts";
import type { BeautifyOptions } from "./index.ts";

const f = beautifyCypher;

/** Formatting an already formatted query must be a no-op. */
function expectFormatted(
  input: string,
  expected: string,
  options?: BeautifyOptions,
) {
  const first = f(input, options);
  expect(first).toBe(expected);
  expect(f(first, options)).toBe(first);
}

describe("clauses", () => {
  test("puts each clause on its own line and uppercases keywords", () => {
    expectFormatted(
      `\n    match (n) where n.name = "Bob" return n limit 1\n`,
      `MATCH (n)\nWHERE n.name = "Bob"\nRETURN n\nLIMIT 1`,
    );
  });

  test("keeps patterns intact", () => {
    expectFormatted("MATCH ()--()", "MATCH ()--()");
    expectFormatted(
      "MATCH (a)--() return a limit 1",
      "MATCH (a)--()\nRETURN a\nLIMIT 1",
    );
  });

  test("normalises spacing around labels and property maps", () => {
    expectFormatted(
      "MATCH (a   :  SomeLabel { p: 1  })--()",
      "MATCH (a:SomeLabel {p: 1})--()",
    );
  });

  test("handles a missing space after a clause keyword", () => {
    expectFormatted("MATCH(n) RETURN(n)", "MATCH (n)\nRETURN (n)");
  });

  test("recognises multi word clauses", () => {
    expectFormatted(
      "match (a) optional match (a)-->(b) detach delete b",
      "MATCH (a)\nOPTIONAL MATCH (a)-->(b)\nDETACH DELETE b",
    );
  });

  test("splits ORDER BY, SKIP and LIMIT", () => {
    expectFormatted(
      "MATCH (n) RETURN n ORDER BY n.name DESC SKIP 5 LIMIT 10",
      "MATCH (n)\nRETURN n\nORDER BY n.name DESC\nSKIP 5\nLIMIT 10",
    );
  });

  test("indents ON CREATE / ON MATCH under MERGE", () => {
    expectFormatted(
      "MERGE (n:X {id: 1}) ON CREATE SET n.a = 1 ON MATCH SET n.b = 2 RETURN n",
      [
        "MERGE (n:X {id: 1})",
        "  ON CREATE SET n.a = 1",
        "  ON MATCH SET n.b = 2",
        "RETURN n",
      ].join("\n"),
    );
  });

  test("does not mistake STARTS WITH for a WITH clause", () => {
    expectFormatted(
      "MATCH (n) WHERE n.a STARTS WITH 'x' AND n.b ENDS WITH 'y' RETURN n",
      "MATCH (n)\nWHERE n.a STARTS WITH 'x' AND n.b ENDS WITH 'y'\nRETURN n",
    );
  });

  test("does not mistake LOAD CSV WITH HEADERS for a WITH clause", () => {
    expectFormatted(
      "LOAD CSV WITH HEADERS FROM 'file:///d.csv' AS row MERGE (p:P {id: row.id})",
      "LOAD CSV WITH HEADERS FROM 'file:///d.csv' AS row\nMERGE (p:P {id: row.id})",
    );
  });

  test("surrounds UNION with blank lines", () => {
    expectFormatted(
      "MATCH (a) RETURN a UNION ALL MATCH (b) RETURN b",
      "MATCH (a)\nRETURN a\n\nUNION ALL\n\nMATCH (b)\nRETURN b",
    );
  });

  test("separates statements", () => {
    expectFormatted(
      "MATCH (a) RETURN a; MATCH (b) RETURN b;",
      "MATCH (a)\nRETURN a;\n\nMATCH (b)\nRETURN b;",
    );
  });

  test("keeps query prefixes on the first clause", () => {
    expectFormatted(
      "explain match (n) return n",
      "EXPLAIN MATCH (n)\nRETURN n",
    );
    expectFormatted(
      "profile match (n) return n",
      "PROFILE MATCH (n)\nRETURN n",
    );
  });
});

describe("comments", () => {
  test("keeps a trailing comment on its line and a standalone one on its own", () => {
    expectFormatted(
      "match (a:Drawing) // inline comment\nreturn a\n// new line comment\nlimit 1",
      "MATCH (a:Drawing) // inline comment\nRETURN a\n// new line comment\nLIMIT 1",
    );
  });

  test("preserves block comments verbatim", () => {
    expectFormatted(
      "MATCH (n) /* keep IS this AS is */ RETURN n",
      "MATCH (n) /* keep IS this AS is */\nRETURN n",
    );
  });

  test("a trailing comment does not force the code before it to wrap", () => {
    expectFormatted(
      "MATCH (n) WITH n ORDER BY labels(n) ASC //use the preferred label when several match\nRETURN n",
      [
        "MATCH (n)",
        "WITH n",
        "ORDER BY labels(n) ASC //use the preferred label when several match",
        "RETURN n",
      ].join("\n"),
    );
  });
});

describe("strings and identifiers", () => {
  test("does not lose track of escaped quotes", () => {
    expectFormatted(
      `MATCH (n) WHERE n.name = 'O\\'Brien' RETURN n`,
      `MATCH (n)\nWHERE n.name = 'O\\'Brien'\nRETURN n`,
    );
  });

  test("leaves keywords inside strings alone", () => {
    expectFormatted(
      `RETURN 'match (n) return n' AS s`,
      `RETURN 'match (n) return n' AS s`,
    );
  });

  test("leaves backtick quoted identifiers alone", () => {
    expectFormatted(
      "MATCH (n:`Weird Label`) RETURN n.`some prop`",
      "MATCH (n:`Weird Label`)\nRETURN n.`some prop`",
    );
    expectFormatted(
      "MATCH (n:`return`) RETURN n",
      "MATCH (n:`return`)\nRETURN n",
    );
  });

  test("keeps parameters intact", () => {
    expectFormatted(
      "MATCH (n {id: $id}) RETURN n",
      "MATCH (n {id: $id})\nRETURN n",
    );
  });
});

describe("expressions", () => {
  test("spaces operators", () => {
    expectFormatted(
      "MATCH (n) WHERE n.a=1 AND n.b<>2 AND n.c>=3 RETURN n",
      "MATCH (n)\nWHERE n.a = 1 AND n.b <> 2 AND n.c >= 3\nRETURN n",
    );
  });

  test("keeps unary minus glued to its operand", () => {
    expectFormatted("RETURN -1, 2 - 3, -n.x", "RETURN -1, 2 - 3, -n.x");
  });

  test("uppercases NOT before a parenthesis but leaves function names alone", () => {
    expectFormatted(
      "match (n) where not ()-[:R]->(n) and not (n.a or n.b) return n",
      "MATCH (n)\nWHERE NOT ()-[:R]->(n) AND NOT (n.a OR n.b)\nRETURN n",
    );
    expectFormatted(
      "RETURN count(*), collect(n), all(x IN r WHERE x), exists(n.p)",
      "RETURN count(*), collect(n), all(x IN r WHERE x), exists(n.p)",
    );
  });

  test("does not explode short function calls", () => {
    expectFormatted(
      "MATCH (n) WITH n, count(*) AS c WHERE c > 1 RETURN n",
      "MATCH (n)\nWITH n, count(*) AS c\nWHERE c > 1\nRETURN n",
    );
    expectFormatted("RETURN range(0, 10) AS r", "RETURN range(0, 10) AS r");
  });

  test("keeps short lists and maps on one line", () => {
    expectFormatted(
      "UNWIND [1,2,3] AS x RETURN x",
      "UNWIND [1, 2, 3] AS x\nRETURN x",
    );
  });

  test("keeps variable length and alternation patterns tight", () => {
    expectFormatted(
      "MATCH p = (a)-[r:KNOWS|LIKES*1..3]->(b) RETURN p",
      "MATCH p = (a)-[r:KNOWS|LIKES*1..3]->(b)\nRETURN p",
    );
  });

  test("formats map projections", () => {
    expectFormatted(
      "MATCH (n) RETURN n { .name, .age, friends: [(n)-->(m) | m.name] }",
      "MATCH (n)\nRETURN n {.name, .age, friends: [(n)-->(m) | m.name]}",
    );
  });

  test("does not treat WHERE inside a comprehension as a clause", () => {
    expectFormatted(
      "RETURN [x IN range(0,10) WHERE x % 2 = 0 | x * 2] AS evens",
      "RETURN [x IN range(0, 10) WHERE x % 2 = 0 | x * 2] AS evens",
    );
  });

  test("keeps quantified path patterns tight", () => {
    expectFormatted(
      "MATCH (a)((b)-[:R]->(c)){1,3}(d) RETURN d",
      "MATCH (a)((b)-[:R]->(c)){1,3}(d)\nRETURN d",
    );
  });

  test("keeps a short CASE inline and breaks a long one", () => {
    expectFormatted(
      "RETURN CASE n.x WHEN 1 THEN 'a' ELSE 'b' END AS c",
      "RETURN CASE n.x WHEN 1 THEN 'a' ELSE 'b' END AS c",
    );
    expectFormatted(
      "RETURN CASE WHEN n.score > 90 THEN 'excellent' WHEN n.score > 70 THEN 'good' ELSE 'poor' END AS grade",
      [
        "RETURN CASE",
        "  WHEN n.score > 90 THEN 'excellent'",
        "  WHEN n.score > 70 THEN 'good'",
        "  ELSE 'poor'",
        "END AS grade",
      ].join("\n"),
    );
  });
});

describe("subqueries", () => {
  test("breaks CALL { } and indents its clauses", () => {
    expectFormatted(
      "MATCH (a) CALL { WITH a MATCH (a)--(b) RETURN b } RETURN b",
      [
        "MATCH (a)",
        "CALL {",
        "  WITH a",
        "  MATCH (a)--(b)",
        "  RETURN b",
        "}",
        "RETURN b",
      ].join("\n"),
    );
  });

  test("keeps IN TRANSACTIONS attached to the closing brace", () => {
    expectFormatted(
      "MATCH (n) CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS",
      [
        "MATCH (n)",
        "CALL {",
        "  WITH n",
        "  DETACH DELETE n",
        "} IN TRANSACTIONS OF 1000 ROWS",
      ].join("\n"),
    );
  });

  test("keeps short EXISTS and COUNT subqueries inline", () => {
    expectFormatted(
      "MATCH (n) WHERE EXISTS { (n)-->(:Post) } RETURN COUNT { (n)-->() } AS deg",
      "MATCH (n)\nWHERE EXISTS { (n)-->(:Post) }\nRETURN COUNT { (n)-->() } AS deg",
    );
  });

  test("keeps a short FOREACH inline", () => {
    expectFormatted(
      "MATCH (n) FOREACH (x IN [1,2,3] | SET n.v = x)",
      "MATCH (n)\nFOREACH (x IN [1, 2, 3] | SET n.v = x)",
    );
  });
});

describe("wrapping", () => {
  test("breaks a long projection at its commas", () => {
    expectFormatted(
      "MATCH (person:Person)-[:ACTED_IN]->(movie:Movie) RETURN person.name AS actorName, movie.title AS movieTitle, movie.released AS releaseYear",
      [
        "MATCH (person:Person)-[:ACTED_IN]->(movie:Movie)",
        "RETURN person.name AS actorName,",
        "  movie.title AS movieTitle,",
        "  movie.released AS releaseYear",
      ].join("\n"),
    );
  });

  test("breaks a long predicate at AND", () => {
    expectFormatted(
      "MATCH (n:Person) WHERE n.age > 18 AND n.name STARTS WITH 'A' AND n.city IN ['Berlin','Paris','London'] AND n.active RETURN n",
      [
        "MATCH (n:Person)",
        "WHERE n.age > 18",
        "  AND n.name STARTS WITH 'A'",
        "  AND n.city IN ['Berlin', 'Paris', 'London']",
        "  AND n.active",
        "RETURN n",
      ].join("\n"),
    );
  });

  test("breaks a long argument list", () => {
    expectFormatted(
      `CALL apoc.periodic.iterate("MATCH (n) RETURN n", "SET n.x = 1", {batchSize: 100})`,
      [
        "CALL apoc.periodic.iterate(",
        `  "MATCH (n) RETURN n",`,
        `  "SET n.x = 1",`,
        "  {batchSize: 100}",
        ")",
      ].join("\n"),
    );
  });

  test("indents a nested CASE relative to its place in the list", () => {
    expectFormatted(
      "match (n) return n.sku as sku, case when n.price > 1000 then 'premium' when n.price > 500 then 'mid' else 'budget' end as tier, n.other as other",
      [
        "MATCH (n)",
        "RETURN n.sku AS sku,",
        "  CASE",
        "    WHEN n.price > 1000 THEN 'premium'",
        "    WHEN n.price > 500 THEN 'mid'",
        "    ELSE 'budget'",
        "  END AS tier,",
        "  n.other AS other",
      ].join("\n"),
    );
  });

  test("a call opening on the keyword's line is not indented twice", () => {
    expectFormatted(
      `CALL apoc.periodic.iterate("MATCH (n) RETURN n", "SET n.x = 1", {batchSize: 1000, parallel: false})`,
      [
        "CALL apoc.periodic.iterate(",
        `  "MATCH (n) RETURN n",`,
        `  "SET n.x = 1",`,
        "  {batchSize: 1000, parallel: false}",
        ")",
      ].join("\n"),
    );
  });

  test("respects maxWidth", () => {
    expectFormatted(
      "MATCH (person:Person) RETURN person.name AS name, person.age AS age",
      "MATCH (person:Person)\nRETURN person.name AS name,\n  person.age AS age",
      { maxWidth: 40 },
    );
    expectFormatted(
      "MATCH (person:Person) RETURN person.name AS name, person.age AS age",
      "MATCH (person:Person)\nRETURN person.name AS name, person.age AS age",
      { maxWidth: 200 },
    );
  });
});

describe("options", () => {
  test("indent accepts a width or a string", () => {
    expectFormatted(
      "MATCH (a) CALL { WITH a RETURN a AS b } RETURN b",
      "MATCH (a)\nCALL {\n    WITH a\n    RETURN a AS b\n}\nRETURN b",
      { indent: 4 },
    );
    expectFormatted(
      "MATCH (a) CALL { WITH a RETURN a AS b } RETURN b",
      "MATCH (a)\nCALL {\n\tWITH a\n\tRETURN a AS b\n}\nRETURN b",
      { indent: "\t" },
    );
  });

  test("keywordCase", () => {
    expectFormatted("match (n) return n", "match (n)\nreturn n", {
      keywordCase: "lower",
    });
    expectFormatted("match (n) Return n", "match (n)\nReturn n", {
      keywordCase: "preserve",
    });
  });

  test("preserveBlankLines", () => {
    expectFormatted("MATCH (a)\n\nRETURN a", "MATCH (a)\n\nRETURN a");
    expectFormatted("MATCH (a)\n\nRETURN a", "MATCH (a)\nRETURN a", {
      preserveBlankLines: false,
    });
  });

  test("parseStrings reformats embedded queries only when asked", () => {
    const query = `CALL apoc.periodic.iterate("match (n) return n", "set n.x=1", {batchSize:100})`;
    expect(f(query)).toContain(`"match (n) return n"`);
    const parsed = f(query, { parseStrings: true });
    expect(parsed).toContain("MATCH (n)");
    expect(parsed).toContain("RETURN n");
    expect(f(parsed, { parseStrings: true })).toBe(parsed);
  });

  test("parseStrings leaves strings that are not queries alone", () => {
    expectFormatted(
      `MATCH (n) WHERE n.bio = 'i like to match socks' RETURN n`,
      `MATCH (n)\nWHERE n.bio = 'i like to match socks'\nRETURN n`,
      { parseStrings: true },
    );
  });
});

describe("robustness", () => {
  test("returns an empty string for empty input", () => {
    expect(f("")).toBe("");
    expect(f("   \n  ")).toBe("");
    expect(f(undefined as unknown as string)).toBe("");
  });

  test("does not throw on unbalanced brackets", () => {
    expect(() => f("MATCH (n:Person {name: 'a'")).not.toThrow();
    expect(() => f("MATCH (n)) RETURN n")).not.toThrow();
    expect(() => f("MATCH (n} RETURN n")).not.toThrow();
    expect(() => f("RETURN ]")).not.toThrow();
  });

  test("does not throw on unterminated strings or comments", () => {
    expect(() => f("MATCH (n) WHERE n.x = 'abc")).not.toThrow();
    expect(() => f("MATCH (n) /* unterminated")).not.toThrow();
    expect(() => f("MATCH (n:`unterminated")).not.toThrow();
  });

  test("keeps an unmatched closing bracket instead of swallowing it", () => {
    expectFormatted("n)e", "n) e");
    expectFormatted("MATCH (n)) RETURN n", "MATCH (n))\nRETURN n");
  });

  test("never drops non whitespace characters", () => {
    const strip = (value: string) => value.replace(/\s+/g, "").toUpperCase();
    const queries = [
      "MATCH (n)-[r:R]->(m) WHERE n.a IN [1,2] RETURN n, r, m",
      "MERGE (a:A {k: $k}) ON CREATE SET a.t = datetime() RETURN a",
      "CALL { MATCH (n) RETURN n } IN TRANSACTIONS",
      "RETURN CASE WHEN 1 > 0 THEN 'y' ELSE 'n' END",
      "UNWIND $rows AS row CREATE (n:N) SET n += row",
      "MATCH (n) /* c */ // t\nRETURN n",
      "m}S",
      "RETURN ]]",
    ];
    for (const query of queries) {
      expect(strip(f(query))).toBe(strip(query));
    }
  });

  test("is stable and lossless for every prefix of a query", () => {
    // The web demo reformats on each keystroke, so half typed input matters.
    const strip = (value: string) => value.replace(/\s+/g, "").toUpperCase();
    const query =
      "MATCH (a:A)-[r:R*1..5]->(b) WHERE all(x IN nodes(p) WHERE x.ok) " +
      "CALL { WITH a MATCH (a)--(c) RETURN c } RETURN [n IN nodes(p) | n {.id}] AS q";

    for (let end = 1; end <= query.length; end++) {
      const prefix = query.slice(0, end);
      const once = f(prefix);
      expect(f(once), `not idempotent for prefix ${end}`).toBe(once);
      expect(strip(once), `lost content for prefix ${end}`).toBe(strip(prefix));
    }
  });
});
