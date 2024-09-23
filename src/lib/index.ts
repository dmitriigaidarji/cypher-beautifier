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
function beautifyCypher(query: string) {
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
  let i = 0;
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
      if (allBrackets.includes(char)) {
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
          str = "";
        }
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
  console.log(result);

  return result.trim();
}

export default beautifyCypher;
