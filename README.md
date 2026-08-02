# Cypher Beautifier

[![HitCount](https://hits.dwyl.com/dmitriigaidarji/cypher-beautifier.svg)](https://hits.dwyl.com/dmitriigaidarji/cypher-beautifier)

A simple NPM package that formats and beautifies Cypher queries for improved readability

### NPM

[![https://nodei.co/npm/cypher-beautifier.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/cypher-beautifier.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/cypher-beautifier)

### Installation

```bash
npm install cypher-beautifier
```

### Usage

```typescript jsx
import beautifyCypher from "cypher-beautifier";

const query = `
    match (n) where n.name = "Bob" return n limit 1
`;

const formatted = beautifyCypher(query);

console.log(formatted);

/*
MATCH (n)
WHERE n.name = "Bob"
RETURN n
LIMIT 1
 */
```

### API

```typescript
type KeywordCase = "upper" | "lower" | "preserve";

interface BeautifyOptions {
  parseStrings?: boolean;
  indent?: number | string;
  maxWidth?: number;
  keywordCase?: KeywordCase;
  preserveBlankLines?: boolean;
}

declare function beautifyCypher(
  query: string,
  options?: BeautifyOptions,
): string;
export default beautifyCypher;
```

| Option             | Type               | Description                                                                                           | Default |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------------------------- | ------- |
| parseStrings       | `boolean`          | Also format Cypher embedded in string literals, such as the queries passed to `apoc.periodic.iterate` | `false` |
| indent             | `number \| string` | Indent width in spaces, or the exact string to indent with (e.g. `"\t"`)                              | `2`     |
| maxWidth           | `number`           | Column the formatter tries to keep lines under before wrapping                                        | `80`    |
| keywordCase        | `KeywordCase`      | Render recognised keywords as `upper`, `lower`, or leave them as written (`preserve`)                 | `upper` |
| preserveBlankLines | `boolean`          | Keep a single blank line wherever the author left one                                                 | `true`  |

### How it formats

Each clause starts on its own line, and lines only wrap when they exceed
`maxWidth` — short queries stay compact instead of being exploded onto one line
per token.

```cypher
MATCH (person:Person)-[:ACTED_IN]->(movie:Movie)
WHERE person.born > 1970
  AND movie.released IN [2001, 2002, 2003]
RETURN person.name AS actorName,
  movie.title AS movieTitle,
  movie.released AS releaseYear
ORDER BY releaseYear DESC
LIMIT 10
```

Subqueries, `FOREACH` and `CASE` keep their contents indented, and stay on one
line when they fit:

```cypher
MATCH (a:Person)
CALL {
  WITH a
  MATCH (a)-[:WROTE]->(p:Post)
  RETURN p
  ORDER BY p.published DESC
  LIMIT 3
}
WHERE EXISTS { (a)-[:FOLLOWS]->(:Person) }
RETURN a.name AS author, collect(p.title) AS posts
```

A few properties the formatter is tested against:

- **Idempotent** — formatting an already formatted query returns it unchanged.
- **Lossless** — no non-whitespace character is ever added or dropped.
- **Never throws** — half-typed or malformed input (unbalanced brackets,
  unterminated strings or comments) is formatted as far as it can be and
  returned, so it is safe to run on every keystroke.

Strings, backtick-quoted identifiers, parameters, and both `//` and `/* */`
comments are parsed properly, so keywords inside them are left alone.

### Development

```bash
npm install
npm test            # unit tests
npm run dev         # the demo page at cypher.gaidarji.com
npm run build       # the published library
```

Pull requests get a **self-contained preview build** attached to the CI run
(see `.github/workflows/pr-preview.yml`). Download it from the run's artifacts
and open `index.html` directly — it embeds everything it needs, so it runs that
branch's formatter with no server. The same workflow comments the before/after
formatting of every query in `cyphers/`, which you can also produce locally:

```bash
npm run build && npm run format-report
```
