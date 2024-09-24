const allKeywords = [
  "AND",
  "OR",
  "XOR",
  "STARTS",
  "ENDS",
  "WITH",
  "CONTAINS",
  "OPTIONAL MATCH",
  "MERGE",
  "MATCH",
  "RETURN",
  "SET",
  "ORDER BY",
  "LIMIT",
  "ON",
  "CYPHER",
  "WHERE",
  "OPTIONAL",
  "CASE",
  "UNION",
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
      const isNewLine = true;
      // let isNewLine =
      //   query.charAt(i - 1) === "\n" ||
      //   (query.charAt(i - 1) === " " && query.charAt(i - 2) === "\n");
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
  let lastKeyword = "";
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

        if (isNewLine) {
          result = result.trimEnd();
        }
        result += `${isNewLine ? "\n" : ""}//${query.substring(i + commentStart.length, end)}\n`;
        // result += copyOver;
        if (currentIndent > 0) {
          result += oneTab + oneTab;
        }
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
            if (
              str === "SET" ||
              str === "AND" ||
              str === "WITH" ||
              str === "OR" ||
              str === "RETURN" ||
              str === "WHERE" ||
              str === "CASE"
            ) {
              currentIndent += 1;
              const leftTab = [
                "SET",
                "AND",
                "WITH",
                "OR",
                "WHERE",
                "CASE",
              ].includes(str)
                ? oneTab
                : "";
              let leftNewLine = "\n";
              if (
                (str === "WHERE" && lastKeyword === "WITH") ||
                str === "RETURN"
              ) {
                leftNewLine += "\n";
              }
              result = result.trim() + leftNewLine + leftTab + str + " "; //+ oneTab + oneTab;
            } else {
              currentIndent = 0;
              let newLines = "\n";
              if (str === "MATCH" && lastKeyword !== "MATCH") {
                newLines += "\n";
              } else if (
                str === "OPTIONAL" &&
                query.substring(i + 1, i + 6) === "MATCH"
              ) {
                if (lastKeyword !== "MATCH") {
                  newLines += "\n";
                }
                str = "OPTIONAL MATCH";
                i = i + 6;
              }
              result = result.trim() + newLines + str + " ";
            }
            lastKeyword = str;
          } else {
            result += str + " ";
          }
        }
        str = "";
      }
      // if comma; end word
      else if (char === "," && currentIndent > 0 && brackets.length === 0) {
        if (str) {
          result = result + str + char + "\n" + oneTab + oneTab;
        } else {
          // remove space before comma
          result = result.trimEnd() + char + "\n" + oneTab + oneTab;
        }
        str = "";
      }
      // add space after comma
      else if (char === "," && query.charAt(i + 1) !== " ") {
        result += str + char + " ";
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
