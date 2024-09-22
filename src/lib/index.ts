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
    /\b(OPTIONAL MATCH|MATCH|RETURN|SET|ORDER BY|LIMIT)\b/gi,
    function (match) {
      return "\n" + match.toUpperCase() + " ";
    },
  );

  query = query.replace(/  +/g, " ");

  if (query[0] === "\n") {
    query = query.substring(1);
  }

  // no spaces before
  query = query.replace(/( :)/gi, function (match) {
    return match.trim();
  });

  query = query
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join("\n");
  console.log(query);

  return query;
}

export default beautifyCypher;
