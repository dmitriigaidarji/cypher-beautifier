const allKeywords = [
  "AND",
  "OR",
  "XOR",
  "WITH",
  "CONTAINS",
  "OPTIONAL MATCH",
  "MERGE",
  "MATCH",
  "RETURN",
  "SET",
  "LIMIT",
  "ON",
  "CYPHER",
  "WHERE",
  "OPTIONAL",
  "CASE",
  "UNION",
  "CALL",
  "ORDER",
  "EXISTS",
  "WHEN",
  "UNWIND",
];
const operators = ["STARTS", "ENDS", "IS", "NULL", "NOT", "IN"];
const noIndentWords = [
  "DATE",
  "TOSTRING",
  "TOFLOAT",
  // "COALESCE",
  "ROUND",
  "SUM",
  "ELEMENTID",
  "ID",
  "MAX",
  "MIN",
  "LABELS",
  "PROPERTIES",
  "DATETIME",
  "COLLECT",
  // "ANY",
  "HEAD",
  "NODES",
  "RELATIONSHIPS",
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

function encodeComments(query: string) {
  // encode comments
  let i = 0;
  while (i < query.length) {
    if (query.charAt(i) === "/" && query.charAt(i + 1) === "/") {
      const end = query.indexOf("\n", i + 1);
      if (end !== -1) {
        const middle = query.substring(i + 2, end);
        const jump =
          commentStart.length + commentEND.length + middle.length - 2;
        const isNewLine = true;
        if (middle.trim().length > 0) {
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
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  return query;
}
function getIndentSpaces(indent: number, minimumIndent: number) {
  return Array(Math.max(indent, minimumIndent)).fill(oneTab).join("");
}

interface IProps {
  parseStrings?: boolean; // default false
}
function beautifyCypher(query: string, options?: IProps) {
  query = encodeComments(query);

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
  let brackets: { char: string; isRoundForIndent: boolean }[] = [];
  let currentQuoute = "";
  let str = "";
  let insideSting = false;
  // add indents
  let currentIndent = 0;
  let roundParenthesisCount = 0;
  const indentSize = 6;
  let lastKeyword = "";
  let i = 0;
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
    if (!insideSting || options?.parseStrings === true) {
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
          // apoc calls etc. go next line
          if (
            char === "(" &&
            str.length > 0 &&
            str[str.length - 1].match(/[a-z]/i) &&
            !noIndentWords.some((t) => str.toUpperCase().includes(t)) &&
            !allKeywords.some((t) => str.toUpperCase().includes(t))
          ) {
            brackets.push({
              char,
              isRoundForIndent: true,
            });
            currentIndent = brackets.length + 1;
            str +=
              char + "\n" + getIndentSpaces(currentIndent, brackets.length);
            roundParenthesisCount++;
          } else {
            brackets.push({
              char,
              isRoundForIndent: false,
            });
            // add a space after keyword
            if (allKeywords.some((t) => str.toUpperCase().includes(t))) {
              str += " " + char;
            } else {
              str += char;
            }
          }
        } else {
          const last = brackets.pop()!;
          const lastPaired = bracketPairs[last?.char as "{"];
          if (lastPaired !== char) {
            throw Error(
              `Wrong bracket. Expected ${lastPaired}, but received ${char}`,
            );
          }
          currentIndent = Math.max(0, currentIndent - 1);
          if (char === "}" && brackets.length === 0) {
            str += "\n" + char + " ";
            result += str;
            str = "";
          } else if (
            char === ")" &&
            roundParenthesisCount > 0 &&
            last.isRoundForIndent
          ) {
            roundParenthesisCount--;
            str +=
              "\n" +
              getIndentSpaces(Math.max(1, currentIndent), brackets.length) +
              char;
          } else {
            str += char;
          }
          currentIndent = brackets.length;
        }
      }
      // if space; end word
      else if (char === " ") {
        if (str.length > 0) {
          const upperCaseStr = str.toUpperCase();
          // close word
          if (allKeywords.includes(upperCaseStr)) {
            str = upperCaseStr;
            if (
              str === "SET" ||
              str === "AND" ||
              str === "WITH" ||
              str === "OR"
            ) {
              currentIndent = Math.max(1, currentIndent);
              const leftTab = ["SET", "AND", "WITH", "OR", "CASE"].includes(str)
                ? oneTab
                : "";
              let leftNewLine = "\n";
              result = result.trimEnd() + leftNewLine + leftTab + str + " "; //+ oneTab + oneTab;
            } else {
              currentIndent = Math.max(brackets.length, currentIndent - 1);
              // currentIndent = updateIndent({
              //   keyword: str,
              //   indent: currentIndent,
              //   minimalIndent: brackets.length,
              // });
              let newLines = "\n";
              let addSpaceInEnd = true;
              let addIndent = 0;
              if (
                str === "MATCH" &&
                lastKeyword !== "MATCH" &&
                currentIndent === 0
              ) {
                newLines += "\n";
              } else if (
                str === "OPTIONAL" &&
                query.substring(i + 1, i + 6).toUpperCase() === "MATCH"
              ) {
                if (lastKeyword !== "MATCH") {
                  newLines += "\n";
                }
                str = "OPTIONAL MATCH";
                i = i + 6;
              } else if (
                str === "EXISTS" &&
                query.substring(i + 1, i + 2) === "{"
              ) {
                str += " {\n" + getIndentSpaces(1, brackets.length);
                brackets.push({ char: "{", isRoundForIndent: false });
                i = i + 1;
                addIndent++;
                addSpaceInEnd = false;
              } else if (
                str === "RETURN" &&
                query.substring(i + 1, i + 2) === "{"
              ) {
                str += " {\n" + getIndentSpaces(2, brackets.length);
                brackets.push({ char: "{", isRoundForIndent: false });
                i = i + 1;
                addIndent++;
                addSpaceInEnd = false;
              } else if (
                str === "CASE" &&
                query.substring(i + 1, i + 5).toUpperCase() === "WHEN"
              ) {
                str += " WHEN ";
                i = i + 5;
              }
              result =
                result.trimEnd() +
                newLines +
                getIndentSpaces(currentIndent, 0) +
                str +
                (addSpaceInEnd ? " " : "");
              currentIndent += addIndent;
            }
            lastKeyword = str;
          } else if (operators.includes(upperCaseStr)) {
            str = upperCaseStr;
            if (["ENDS", "STARTS"].includes(str)) {
              // find 'with'
              const rest = query.substring(i, i + 5);
              if (rest.toUpperCase() === " WITH") {
                result += str + " WITH" + " ";
                i += 5;
              } else {
                result += str + " ";
              }
            } else {
              result += str + " ";
            }
          } else {
            result += str + " ";
          }
        }
        str = "";
      }
      // if comma; end word
      else if (char === ",") {
        if (str) {
          currentIndent = brackets.length + 1;
          result =
            result +
            str +
            char +
            "\n" +
            getIndentSpaces(currentIndent, brackets.length);
        } else {
          // remove space before comma
          result =
            result.trimEnd() +
            char +
            "\n" +
            getIndentSpaces(currentIndent, brackets.length);
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
