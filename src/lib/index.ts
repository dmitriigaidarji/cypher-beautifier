const allKeywords = [
  "CASE",
  "AND",
  "OR",
  "WHEN",
  "XOR",
  "DISTINCT",
  "IN",
  "AS",
  "STARTS WITH",
  "ENDS WITH",
  "CONTAINS",
  "NOT",
  "OPTIONAL MATCH",
  "MERGE",
  "MATCH",
  "RETURN",
  "SET",
  "ORDER BY",
  "LIMIT",
];
function beautifyCypher(query: string) {
  // spaces
  query = query.replace(
    /\b(CASE|AND|OR|WHEN|XOR|DISTINCT|IN|AS|STARTS WITH|ENDS WITH|CONTAINS|NOT)\b/gi,
    function (match) {
      return match.toUpperCase() + " ";
    },
  );

  // new lines
  query = query.replace(
    /\b(OPTIONAL MATCH|MERGE|MATCH|RETURN|SET|ORDER BY|LIMIT)\b/gi,
    function (match) {
      const v = match.toUpperCase();
      switch (v) {
        case "SET":
          return "\n" + v + "\n";
        default:
          return "\n" + v + " ";
      }
    },
  );

  query = query.replace(/  +/g, " ");

  // no spaces before
  query = query.replace(/( :)/gi, function (match) {
    return match.trim();
  });

  // no double new lines
  query = query
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join("\n");

  // add double new lines
  query = query.replace(/\b(MERGE)\b/gi, function (match) {
    return "\n" + match.toUpperCase() + " ";
  });

  // add indents
  let currentIndent = 0;
  const indentSize = 6;
  query = query
    .split("\n")
    .map((t) => {
      if (t.startsWith("SET")) {
        currentIndent += 2;
        return (
          Array((currentIndent - 1) * indentSize)
            .fill(" ")
            .join("") + t
        );
      } else if (allKeywords.includes(t.split(" ")[0])) {
        currentIndent = 0; //Math.max(0, currentIndent - 1);
      }
      return (
        Array(currentIndent * indentSize)
          .fill(" ")
          .join("") + t
      );
    })
    .join("\n");

  if (query[0] === "\n") {
    query = query.substring(1);
  }

  console.log(query);

  return query;
}

export default beautifyCypher;
