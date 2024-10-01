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
interface IProps {
  parseStrings?: boolean;
}
declare function beautifyCypher(query: string, options?: IProps): string;
export default beautifyCypher;
```

| Option       | Type      | Description                                               | Default |
| ------------ | --------- | --------------------------------------------------------- | ------- |
| parseStrings | `boolean` | If `true` formats code inside quotation marks `'` and `"` | `false` |
