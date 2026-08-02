export type TokenType =
  | "word"
  | "quotedIdentifier"
  | "string"
  | "number"
  | "parameter"
  | "operator"
  | "punctuation"
  | "lineComment"
  | "blockComment";

export interface Token {
  type: TokenType;
  /** raw source text of the token */
  value: string;
  /** number of line breaks between the previous token and this one */
  newlinesBefore: number;
  /** whether any whitespace separated this token from the previous one */
  spaceBefore: boolean;
}

/** Longest match wins, so this list has to stay sorted by length. */
const MULTI_CHAR_OPERATORS = [
  "<--",
  "-->",
  "<-",
  "->",
  "--",
  "<>",
  "!=",
  "<=",
  ">=",
  "=~",
  "+=",
  "..",
];

const SINGLE_CHAR_OPERATORS = "=<>+-*/%^!";
const PUNCTUATION = "()[]{},.:|;";

function isIdentifierStart(char: string) {
  return /[A-Za-z_]/.test(char) || char.charCodeAt(0) > 127;
}

function isIdentifierPart(char: string) {
  return /[A-Za-z0-9_]/.test(char) || char.charCodeAt(0) > 127;
}

function isDigit(char: string | undefined) {
  return char !== undefined && char >= "0" && char <= "9";
}

/**
 * Splits a Cypher query into tokens.
 *
 * Deliberately lenient: unterminated strings, comments and brackets are all
 * tolerated so that the formatter stays usable while a query is being typed.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let newlinesBefore = 0;
  let spaceBefore = false;

  function push(type: TokenType, value: string) {
    tokens.push({ type, value, newlinesBefore, spaceBefore });
    newlinesBefore = 0;
    spaceBefore = false;
  }

  while (index < input.length) {
    const char = input[index];

    if (char === "\n") {
      newlinesBefore++;
      spaceBefore = true;
      index++;
      continue;
    }
    if (char === " " || char === "\t" || char === "\r" || char === "\f") {
      spaceBefore = true;
      index++;
      continue;
    }

    // line comment
    if (char === "/" && input[index + 1] === "/") {
      let end = input.indexOf("\n", index);
      if (end === -1) {
        end = input.length;
      }
      push("lineComment", input.slice(index, end).trimEnd());
      index = end;
      continue;
    }

    // block comment
    if (char === "/" && input[index + 1] === "*") {
      const closing = input.indexOf("*/", index + 2);
      const end = closing === -1 ? input.length : closing + 2;
      push("blockComment", input.slice(index, end));
      index = end;
      continue;
    }

    // string literal, with backslash escapes
    if (char === "'" || char === '"') {
      let cursor = index + 1;
      while (cursor < input.length) {
        if (input[cursor] === "\\") {
          cursor += 2;
          continue;
        }
        if (input[cursor] === char) {
          cursor++;
          break;
        }
        cursor++;
      }
      push("string", input.slice(index, Math.min(cursor, input.length)));
      index = Math.min(cursor, input.length);
      continue;
    }

    // backtick quoted identifier, where `` is an escaped backtick
    if (char === "`") {
      let cursor = index + 1;
      while (cursor < input.length) {
        if (input[cursor] === "`") {
          if (input[cursor + 1] === "`") {
            cursor += 2;
            continue;
          }
          cursor++;
          break;
        }
        cursor++;
      }
      push(
        "quotedIdentifier",
        input.slice(index, Math.min(cursor, input.length)),
      );
      index = Math.min(cursor, input.length);
      continue;
    }

    // parameter: $name, $0 or $`weird name`
    if (char === "$") {
      let cursor = index + 1;
      if (input[cursor] === "`") {
        cursor++;
        while (cursor < input.length && input[cursor] !== "`") {
          cursor++;
        }
        cursor = Math.min(cursor + 1, input.length);
      } else {
        while (cursor < input.length && isIdentifierPart(input[cursor])) {
          cursor++;
        }
      }
      push("parameter", input.slice(index, cursor));
      index = cursor;
      continue;
    }

    // number, taking care not to swallow the `..` range operator
    if (isDigit(char) || (char === "." && isDigit(input[index + 1]))) {
      let cursor = index;
      if (char === "0" && /[xXoO]/.test(input[index + 1] ?? "")) {
        cursor = index + 2;
        const digits = /[xX]/.test(input[index + 1]) ? /[0-9a-fA-F]/ : /[0-7]/;
        while (cursor < input.length && digits.test(input[cursor])) {
          cursor++;
        }
      } else {
        while (isDigit(input[cursor])) {
          cursor++;
        }
        if (input[cursor] === "." && isDigit(input[cursor + 1])) {
          cursor++;
          while (isDigit(input[cursor])) {
            cursor++;
          }
        }
        if (input[cursor] === "e" || input[cursor] === "E") {
          let exponent = cursor + 1;
          if (input[exponent] === "+" || input[exponent] === "-") {
            exponent++;
          }
          if (isDigit(input[exponent])) {
            cursor = exponent;
            while (isDigit(input[cursor])) {
              cursor++;
            }
          }
        }
      }
      push("number", input.slice(index, cursor));
      index = cursor;
      continue;
    }

    if (isIdentifierStart(char)) {
      let cursor = index + 1;
      while (cursor < input.length && isIdentifierPart(input[cursor])) {
        cursor++;
      }
      push("word", input.slice(index, cursor));
      index = cursor;
      continue;
    }

    const operator = MULTI_CHAR_OPERATORS.find((candidate) =>
      input.startsWith(candidate, index),
    );
    if (operator) {
      push("operator", operator);
      index += operator.length;
      continue;
    }

    if (PUNCTUATION.includes(char)) {
      push("punctuation", char);
      index++;
      continue;
    }

    if (SINGLE_CHAR_OPERATORS.includes(char)) {
      push("operator", char);
      index++;
      continue;
    }

    // Anything we do not understand is passed through untouched.
    push("operator", char);
    index++;
  }

  return tokens;
}
