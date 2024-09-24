const allKeywords = [
  "CASE",
  "AND",
  "OR",
  "WHEN",
  "XOR",
  "DISTINCT",
  "IN",
  "AS",
  "STARTS",
  "ENDS",
  "WITH",
  "CONTAINS",
  "NOT",
  "OPTIONAL MATCH",
  "MERGE",
  "MATCH",
  "RETURN",
  "SET",
  "ORDER BY",
  "LIMIT",
  "ON",
  "CYPHER",
];
const bracketPairs = {
  "(": ")",
  "{": "}",
  "[": "]",
};
const openingBrackets = Object.keys(bracketPairs);
const closingBrackets = Object.values(bracketPairs);
const allBrackets = openingBrackets.concat(closingBrackets).join("");

const quotes = ["'", '"'];
const oneTab = "      ";

const commentStart = "<!comment!>"; // these 2 should be the same length
const commentNewLineStart = "<#comment!>"; // these 2 should be the same length

const commentEND = "</!comment!>"; // these 2 should be the same length

function beautifyCypher(query: string) {
  // encode comments
  let i = 0;
  while (i < query.length) {
    if (query.charAt(i) === "/" && query.charAt(i + 1) === "/") {
      const end = query.indexOf("\n", i + 1);
      const middle = query.substring(i + 2, end);
      const jump = commentStart.length + commentEND.length + middle.length - 2;
      let isNewLine =
        query.charAt(i - 1) === "\n" ||
        (query.charAt(i - 1) === " " && query.charAt(i - 2) === "\n");
      // let j = i - 1;
      // while (j > 0) {
      //   if (query.charAt(j) === " ") {
      //     j--;
      //   } else if (query.charAt(j) === "\n") {
      //     isNewLine = true;
      //     j = -1;
      //   } else {
      //     j = -1;
      //   }
      // }
      query =
        query.substring(0, i) +
        (isNewLine ? commentNewLineStart : commentStart) +
        middle +
        commentEND +
        query.substring(end);
      i += jump;
    } else {
      i++;
    }
  }
  i = 0;

  // normalize
  query = query
    .replace(/[\n\t]/g, " ")
    .replace(/  +/g, " ")
    .trim();

  // no spaces before ":"
  query = query.replace(/( :)/gi, function (match) {
    return match.trim();
  });

  let result = "";
  let brackets: string[] = [];
  let currentQuoute = "";
  let str = "";
  let insideSting = false;
  // add indents
  let currentIndent = 0;
  const indentSize = 6;
  while (i < query.length) {
    const char = query.charAt(i);
    if (quotes.includes(char)) {
      if (insideSting && currentQuoute === char) {
        insideSting = false;
        currentQuoute = "";
      } else {
        insideSting = true;
        currentQuoute = char;
      }
    }
    if (!insideSting) {
      if (
        char === commentStart[0] &&
        (query.charAt(i + 1) === commentStart[1] ||
          query.charAt(i + 1) === commentNewLineStart[1])
      ) {
        const end = query.indexOf(commentEND, i);
        if (end === -1) {
          throw Error("Failed to parse comment");
        }
        const isNewLine = query.charAt(i + 1) === commentNewLineStart[1];
        result += str;
        str = "";
        let copyOver = "";
        // copy current indents to the new line;
        let j = result.length - 1;
        while (j > 0 && result.charAt(j) === " ") {
          j--;
        }
        if (j > 0) {
          copyOver = result.substring(j + 1);
        }
        if (isNewLine) {
          result = result.trimEnd();
        }
        result += `${isNewLine ? "\n" : ""}//${query.substring(i + commentStart.length, end)}\n`;
        result += copyOver;
        i = end + commentEND.length - 1;
      }
      // brackets
      else if (allBrackets.includes(char)) {
        if (openingBrackets.includes(char)) {
          brackets.push(char);
        } else {
          const last = brackets.pop() as "{";
          const lastPaired = bracketPairs[last];
          if (lastPaired !== char) {
            throw Error(
              `Wrong bracket. Expected ${lastPaired}, but received ${char}`,
            );
          }
        }
        str += char;
      }
      // if space; end word
      else if (char === " ") {
        if (str.length > 0) {
          // close word
          if (allKeywords.includes(str.toUpperCase())) {
            str = str.toUpperCase();
            if (str === "SET") {
              currentIndent += 2;
              result =
                result.trim() + "\n" + oneTab + str + "\n" + oneTab + oneTab;
            } else {
              currentIndent = 0;
              result = result.trim() + "\n" + str + " ";
            }
          } else {
            result += str + " ";
          }
        }
        str = "";
      }
      // if comma; end word
      else if (char === "," && currentIndent > 0 && brackets.length === 0) {
        result += str + char + "\n" + oneTab + oneTab;
        str = "";
      }
      // else; continue word
      else {
        str += char;
      }
    } else {
      str += char;
    }
    i++;
  }
  result += str;

  return result.trim();
}

export default beautifyCypher;
