import {
  BLANK_LINE_CLAUSES,
  BOOLEAN_OPERATORS,
  CLAUSE_SEQUENCES,
  INDENTED_CLAUSES,
  KEYWORDS,
  PATTERN_CONNECTORS,
  QUERY_PREFIXES,
  SUBQUERY_KEYWORDS,
} from "./keywords";
import { Token, tokenize } from "./tokenizer";
import {
  Doc,
  breakParent,
  concat,
  group,
  hardline,
  indent,
  isEmptyDoc,
  line,
  lineSuffix,
  printDocToString,
  softline,
} from "./doc";

export type KeywordCase = "upper" | "lower" | "preserve";

export interface BeautifyOptions {
  /**
   * Reformat Cypher embedded in string literals, e.g. the two queries handed
   * to `apoc.periodic.iterate`. Off by default because it rewrites the
   * whitespace inside the literal.
   */
  parseStrings?: boolean;
  /** Indent as a number of spaces, or the literal string to repeat. */
  indent?: number | string;
  /** Column the printer tries to keep lines under. */
  maxWidth?: number;
  /** How to render recognised keywords. */
  keywordCase?: KeywordCase;
  /** Keep (at most one) blank line where the author left one. */
  preserveBlankLines?: boolean;
}

interface ResolvedOptions {
  parseStrings: boolean;
  indentString: string;
  maxWidth: number;
  keywordCase: KeywordCase;
  preserveBlankLines: boolean;
}

const DEFAULTS: ResolvedOptions = {
  parseStrings: false,
  indentString: "  ",
  maxWidth: 80,
  keywordCase: "upper",
  preserveBlankLines: true,
};

/**
 * Keywords that double as function names. `count(*)` must not become
 * `count (*)`, and `count` must not be uppercased when it is a call.
 */
const FUNCTION_LIKE_KEYWORDS = new Set([
  "ALL",
  "ANY",
  "COLLECT",
  "COUNT",
  "EXISTS",
  "NONE",
  "SINGLE",
]);

const CASE_KEYWORDS = new Set(["WHEN", "THEN", "ELSE", "END"]);

const CLOSING_BRACKETS = new Set([")", "]", "}"]);

/** Bracket kinds, which drive both spacing and where breaks are allowed. */
type GroupKind =
  | "root"
  | "call"
  | "paren"
  | "list"
  | "relDetail"
  | "map"
  | "quantifier"
  | "subquery";

interface ExpressionOptions {
  /** Stop when a clause keyword begins a new clause. */
  allowClauseBreak?: boolean;
  /** Token index the separator logic should treat as "the previous token". */
  previous?: number;
  /** Extra stop condition, evaluated before each token. */
  stop?: () => boolean;
  /**
   * Indent the break points this call produces. Set for clause bodies, whose
   * continuation lines hang under the keyword; left off inside brackets,
   * which already indent their own contents.
   */
  indentBreaks?: boolean;
}

function resolveOptions(options?: BeautifyOptions): ResolvedOptions {
  const indentOption = options?.indent;
  const indentString =
    typeof indentOption === "string"
      ? indentOption
      : " ".repeat(
          typeof indentOption === "number" && indentOption >= 0
            ? indentOption
            : 2,
        );

  return {
    parseStrings: options?.parseStrings ?? DEFAULTS.parseStrings,
    indentString,
    maxWidth:
      typeof options?.maxWidth === "number" && options.maxWidth > 0
        ? options.maxWidth
        : DEFAULTS.maxWidth,
    keywordCase: options?.keywordCase ?? DEFAULTS.keywordCase,
    preserveBlankLines:
      options?.preserveBlankLines ?? DEFAULTS.preserveBlankLines,
  };
}

class Formatter {
  private readonly tokens: Token[];
  private readonly options: ResolvedOptions;
  private readonly depth: number;
  /** Token indices where `-`/`->`/`--` joins two pattern elements. */
  private readonly patternConnectors = new Set<number>();
  /** Token indices where `-`/`+`/`!` is a prefix rather than an infix. */
  private readonly unaryOperators = new Set<number>();
  private readonly contextStack: GroupKind[] = ["root"];
  private index = 0;

  constructor(tokens: Token[], options: ResolvedOptions, depth: number) {
    this.tokens = tokens;
    this.options = options;
    this.depth = depth;
    this.classifyOperators();
  }

  // ---------------------------------------------------------------- helpers

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private get context(): GroupKind {
    return this.contextStack[this.contextStack.length - 1];
  }

  private atPunctuation(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.type === "punctuation" && token.value === value;
  }

  private atClosingBracket(): boolean {
    const token = this.peek();
    return token?.type === "punctuation" && CLOSING_BRACKETS.has(token.value);
  }

  /**
   * A closing bracket only ends something when we are actually inside a
   * bracket. An unmatched one at the top level is just a stray character, and
   * is printed as-is rather than swallowed.
   */
  private atGroupEnd(): boolean {
    return this.contextStack.length > 1 && this.atClosingBracket();
  }

  /** True when the token at `offset` is the given keyword used as a keyword. */
  private atWord(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    if (token?.type !== "word") {
      return false;
    }
    if (token.value.toUpperCase() !== value) {
      return false;
    }
    return !this.isMemberAccess(this.index + offset);
  }

  /** `n.match` and `:match` are a property and a label, never a keyword. */
  private isMemberAccess(index: number): boolean {
    const previous = this.tokens[index - 1];
    return (
      previous?.type === "punctuation" &&
      (previous.value === "." || previous.value === ":")
    );
  }

  private isKeywordToken(index: number): boolean {
    const token = this.tokens[index];
    if (token?.type !== "word") {
      return false;
    }
    return (
      KEYWORDS.has(token.value.toUpperCase()) && !this.isMemberAccess(index)
    );
  }

  /** `(` binds tightly to a name in front of it only when that is a call. */
  private isCallTarget(index: number): boolean {
    const token = this.tokens[index];
    if (!token) {
      return false;
    }
    if (token.type === "quotedIdentifier" || token.type === "parameter") {
      return true;
    }
    if (token.type !== "word") {
      return false;
    }
    if (!this.isKeywordToken(index)) {
      return true;
    }
    return FUNCTION_LIKE_KEYWORDS.has(token.value.toUpperCase());
  }

  private classifyOperators() {
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.type !== "operator") {
        continue;
      }

      const previous = this.tokens[i - 1];
      const next = this.tokens[i + 1];

      if (
        PATTERN_CONNECTORS.has(token.value) &&
        previous?.type === "punctuation" &&
        (previous.value === ")" || previous.value === "]") &&
        next?.type === "punctuation" &&
        (next.value === "(" || next.value === "[")
      ) {
        this.patternConnectors.add(i);
        continue;
      }

      if (token.value === "-" || token.value === "+" || token.value === "!") {
        const isUnary =
          !previous ||
          (previous.type === "operator" &&
            !this.patternConnectors.has(i - 1)) ||
          (previous.type === "punctuation" &&
            "([{,:|".includes(previous.value)) ||
          this.isKeywordToken(i - 1);
        if (isUnary) {
          this.unaryOperators.add(i);
        }
      }
    }
  }

  /**
   * Matches a clause opener at the current position, longest sequence first,
   * so `ON CREATE SET` wins over `CREATE`.
   */
  private matchClause(): { text: string; length: number } | null {
    const token = this.peek();
    if (token?.type !== "word" || this.isMemberAccess(this.index)) {
      return null;
    }

    const previous = this.peek(-1);
    if (previous?.type === "word") {
      const previousWord = previous.value.toUpperCase();
      // `STARTS WITH` / `ENDS WITH` are operators, and `AS with` is an alias.
      if (
        previousWord === "AS" ||
        previousWord === "STARTS" ||
        previousWord === "ENDS"
      ) {
        return null;
      }
    }

    for (const sequence of CLAUSE_SEQUENCES) {
      let matches = true;
      for (let i = 0; i < sequence.length; i++) {
        const candidate = this.peek(i);
        if (
          candidate?.type !== "word" ||
          candidate.value.toUpperCase() !== sequence[i]
        ) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return { text: sequence.join(" "), length: sequence.length };
      }
    }
    return null;
  }

  /**
   * Renders a (possibly multi word) clause keyword. `preserve` echoes the
   * words the author actually typed, which is why this needs the token range
   * rather than just the canonical spelling.
   */
  private renderClauseKeyword(
    startIndex: number,
    clause: { text: string; length: number },
  ) {
    if (this.options.keywordCase === "preserve") {
      const words: string[] = [];
      for (let i = 0; i < clause.length; i++) {
        words.push(this.tokens[startIndex + i].value);
      }
      return words.join(" ");
    }
    return this.options.keywordCase === "lower"
      ? clause.text.toLowerCase()
      : clause.text;
  }

  private renderWord(index: number): string {
    const token = this.tokens[index];
    const upper = token.value.toUpperCase();
    if (
      this.options.keywordCase === "preserve" ||
      !KEYWORDS.has(upper) ||
      this.isMemberAccess(index)
    ) {
      return token.value;
    }
    // `RETURN x AS count` names a variable, not a keyword.
    const previous = this.tokens[index - 1];
    if (previous?.type === "word" && previous.value.toUpperCase() === "AS") {
      return token.value;
    }
    // `count(...)`, `exists(...)` — a call, not a keyword. Only keywords that
    // double as function names qualify; `NOT (a OR b)` is still a keyword.
    const next = this.tokens[index + 1];
    if (
      next?.type === "punctuation" &&
      next.value === "(" &&
      FUNCTION_LIKE_KEYWORDS.has(upper)
    ) {
      return token.value;
    }
    return this.options.keywordCase === "lower" ? upper.toLowerCase() : upper;
  }

  // --------------------------------------------------------------- spacing

  private noSpaceBetween(previousIndex: number, currentIndex: number): boolean {
    const previous = this.tokens[previousIndex];
    const current = this.tokens[currentIndex];
    if (!previous || !current) {
      return true;
    }

    const before = previous.value;
    const after = current.value;
    const beforeIsPunctuation = previous.type === "punctuation";
    const afterIsPunctuation = current.type === "punctuation";

    if (beforeIsPunctuation && "([{".includes(before)) {
      return true;
    }
    if (afterIsPunctuation && (CLOSING_BRACKETS.has(after) || after === ",")) {
      return true;
    }
    if (afterIsPunctuation && after === ";") {
      return true;
    }

    // property access: n.name, but `RETURN n {.name, .age}` keeps its space
    if (afterIsPunctuation && after === ".") {
      return (
        previous.type === "word" ||
        previous.type === "quotedIdentifier" ||
        previous.type === "parameter" ||
        previous.type === "number" ||
        (beforeIsPunctuation && (before === ")" || before === "]"))
      );
    }
    if (beforeIsPunctuation && before === ".") {
      return true;
    }

    // `:` separates a label or type (tight) or a map key (space after)
    if (afterIsPunctuation && after === ":") {
      return true;
    }
    if (beforeIsPunctuation && before === ":") {
      return this.context !== "map";
    }

    // ranges: [1..5] and -[:R*1..3]->
    if (before === ".." || after === "..") {
      return true;
    }

    // relationship detail brackets stay tight: [r:KNOWS|LIKES*1..3]
    if (this.context === "relDetail") {
      if (before === "*" || after === "*" || before === "|" || after === "|") {
        return true;
      }
    }

    // path quantifiers stay tight: ((a)-->(b)){1,3}
    if (this.context === "quantifier") {
      return true;
    }

    // pattern connectors: (a)-[r]->(b)
    if (
      this.patternConnectors.has(currentIndex) &&
      beforeIsPunctuation &&
      (before === ")" || before === "]")
    ) {
      return true;
    }
    if (
      this.patternConnectors.has(previousIndex) &&
      afterIsPunctuation &&
      (after === "(" || after === "[")
    ) {
      return true;
    }

    // calls and subscripts: coalesce(a, b), row[0], $param[0]
    if (afterIsPunctuation && (after === "(" || after === "[")) {
      if (beforeIsPunctuation) {
        // `}` here closed a path quantifier, which binds to what follows it.
        return before === ")" || before === "]" || before === "}";
      }
      return this.isCallTarget(previousIndex);
    }

    // quantified path patterns: ((a)-->(b)){1,3}
    if (
      afterIsPunctuation &&
      after === "{" &&
      beforeIsPunctuation &&
      (before === ")" || before === "]")
    ) {
      return true;
    }

    if (this.unaryOperators.has(previousIndex)) {
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------- clauses

  format(): Doc {
    const statements: Doc[] = [];
    let first = true;

    while (this.index < this.tokens.length) {
      if (this.atPunctuation(";")) {
        this.index++;
        continue;
      }
      const before = this.index;
      const statement = this.printStatement();
      const terminated = this.atPunctuation(";");
      if (terminated) {
        this.index++;
      }

      // Skip statements that produced nothing, so leftover separators cannot
      // pile up into runs of blank lines.
      if (!isEmptyDoc(statement)) {
        if (!first) {
          statements.push(hardline, hardline);
        }
        statements.push(statement);
        if (terminated) {
          statements.push(";");
        }
        first = false;
      }

      if (this.index === before) {
        // Defensive: never spin on input we failed to consume.
        this.index++;
      }
    }

    return concat(statements);
  }

  private printStatement(): Doc {
    const prefix: Doc[] = [];

    while (this.index < this.tokens.length) {
      const token = this.peek();
      if (token?.type !== "word") {
        break;
      }
      const word = token.value.toUpperCase();
      if (!QUERY_PREFIXES.has(word) || this.isMemberAccess(this.index)) {
        break;
      }
      this.index++;
      prefix.push(this.renderWord(this.index - 1), " ");
      if (word === "CYPHER") {
        const options = this.printExpressionParts({ allowClauseBreak: true });
        if (options.length > 0) {
          prefix.push(concat(options), " ");
        }
      }
    }

    const body = this.printClauses();
    return prefix.length > 0 ? concat([...prefix, body]) : body;
  }

  private printClauses(): Doc {
    const parts: Doc[] = [];
    let first = true;
    let previousKeyword = "";

    while (this.index < this.tokens.length) {
      if (this.atGroupEnd() || this.atPunctuation(";")) {
        break;
      }

      const token = this.peek()!;
      const clause = this.matchClause();
      const keyword = clause?.text ?? "";
      const blankBefore = token.newlinesBefore > 1;
      const before = this.index;
      const clauseDoc = this.printClause();

      if (isEmptyDoc(clauseDoc)) {
        if (this.index === before) {
          this.index++;
        }
        continue;
      }

      if (first) {
        parts.push(clauseDoc);
      } else {
        const wantsBlankLine =
          (this.options.preserveBlankLines && blankBefore) ||
          BLANK_LINE_CLAUSES.has(keyword) ||
          BLANK_LINE_CLAUSES.has(previousKeyword);
        const separator = wantsBlankLine
          ? concat([hardline, hardline])
          : hardline;
        parts.push(
          INDENTED_CLAUSES.has(keyword)
            ? indent(concat([separator, clauseDoc]))
            : concat([separator, clauseDoc]),
        );
      }

      previousKeyword = keyword;
      first = false;
      if (this.index === before) {
        this.index++;
      }
    }

    return concat(parts);
  }

  private printClause(): Doc {
    const token = this.peek()!;

    if (token.type === "lineComment") {
      this.index++;
      return concat([token.value, breakParent]);
    }
    if (token.type === "blockComment") {
      this.index++;
      return token.value;
    }

    const clause = this.matchClause();
    if (!clause) {
      const parts = this.printExpressionParts({
        allowClauseBreak: true,
        indentBreaks: true,
      });
      return parts.length > 0 ? group(concat(parts)) : "";
    }

    const keywordStart = this.index;
    this.index += clause.length;
    const keyword = this.renderClauseKeyword(keywordStart, clause);

    if (clause.text === "FOREACH") {
      return this.printForeach(keyword);
    }

    const parts: Doc[] = [];
    if (clause.text === "CALL" && this.atPunctuation("{")) {
      parts.push(this.printSubquery(true));
    }

    const body = this.printExpressionParts({
      allowClauseBreak: true,
      indentBreaks: true,
      previous: parts.length > 0 ? this.index - 1 : undefined,
    });

    if (parts.length === 0 && body.length === 0) {
      return keyword;
    }
    return group(concat([keyword, " ", ...parts, ...body]));
  }

  private printForeach(keyword: string): Doc {
    if (!this.atPunctuation("(")) {
      const body = this.printExpressionParts({
        allowClauseBreak: true,
        indentBreaks: true,
      });
      return body.length > 0 ? group(concat([keyword, " ", ...body])) : keyword;
    }

    this.index++;
    this.contextStack.push("paren");
    const header = this.printExpressionParts({
      stop: () => this.atPunctuation("|"),
    });
    this.contextStack.pop();

    const parts: Doc[] = [keyword, " (", ...header];
    if (this.atPunctuation("|")) {
      this.index++;
      parts.push(" |");
      this.contextStack.push("subquery");
      const body = this.printClauses();
      this.contextStack.pop();
      parts.push(indent(concat([line, body])));
    }
    if (this.atPunctuation(")")) {
      this.index++;
      parts.push(softline, ")");
    }
    return group(concat(parts));
  }

  // ------------------------------------------------------------ expressions

  private printExpressionParts(options: ExpressionOptions = {}): Doc[] {
    const parts: Doc[] = [];
    let previousIndex = options.previous ?? -1;
    let suppressSeparator = previousIndex < 0;
    let pendingHardline = false;
    const breakLine: Doc = options.indentBreaks ? indent(line) : line;

    const separate = () => {
      if (pendingHardline) {
        parts.push(hardline);
        pendingHardline = false;
        return;
      }
      if (suppressSeparator) {
        suppressSeparator = false;
        return;
      }
      if (
        previousIndex >= 0 &&
        !this.noSpaceBetween(previousIndex, this.index)
      ) {
        parts.push(" ");
      }
    };

    while (this.index < this.tokens.length) {
      if (options.stop?.()) {
        break;
      }
      if (this.atGroupEnd() || this.atPunctuation(";")) {
        break;
      }
      if (options.allowClauseBreak && this.matchClause()) {
        break;
      }

      const token = this.peek()!;
      const startIndex = this.index;

      if (token.type === "lineComment") {
        this.index++;
        // A comment that ends its clause can be deferred to the line break the
        // caller is about to emit, so it does not count towards the width.
        const endsTheLine =
          this.index >= this.tokens.length ||
          this.atGroupEnd() ||
          this.atPunctuation(";") ||
          (options.allowClauseBreak && this.matchClause() !== null);

        if (endsTheLine && parts.length > 0 && token.newlinesBefore === 0) {
          parts.push(lineSuffix(" " + token.value), breakParent);
          previousIndex = startIndex;
          continue;
        }

        if (parts.length > 0) {
          // A comment the author put on its own line keeps it, flush with the
          // clause rather than indented as a continuation.
          parts.push(token.newlinesBefore > 0 ? hardline : " ");
        }
        parts.push(token.value, breakParent);
        pendingHardline = true;
        suppressSeparator = false;
        previousIndex = startIndex;
        continue;
      }

      if (token.type === "word" && !this.isMemberAccess(this.index)) {
        const word = token.value.toUpperCase();

        if (word === "CASE") {
          separate();
          parts.push(this.printCase());
          previousIndex = this.index - 1;
          continue;
        }
        if (CASE_KEYWORDS.has(word)) {
          // A stray WHEN/THEN/ELSE/END outside CASE: stop so the caller
          // can decide, unless nothing has been printed yet.
          if (parts.length > 0) {
            break;
          }
        }
        if (BOOLEAN_OPERATORS.has(word)) {
          if (previousIndex >= 0 && !suppressSeparator) {
            parts.push(breakLine);
          } else {
            separate();
          }
          suppressSeparator = false;
          pendingHardline = false;
          parts.push(this.renderWord(this.index));
          previousIndex = this.index;
          this.index++;
          continue;
        }
      }

      if (token.type === "punctuation" && "([{".includes(token.value)) {
        separate();
        parts.push(this.printBracket());
        previousIndex = this.index - 1;
        continue;
      }

      separate();

      switch (token.type) {
        case "blockComment":
          parts.push(token.value);
          break;
        case "string":
          parts.push(this.renderString(token));
          break;
        case "word":
          parts.push(this.renderWord(this.index));
          break;
        case "punctuation":
          parts.push(token.value);
          if (token.value === "," && this.context !== "quantifier") {
            parts.push(breakLine);
            suppressSeparator = true;
          }
          break;
        default:
          parts.push(token.value);
      }

      previousIndex = this.index;
      this.index++;
      if (this.index === startIndex) {
        this.index++;
      }
    }

    return parts;
  }

  private printBracket(): Doc {
    const open = this.peek()!.value;
    const kind = this.classifyBracket();

    if (kind === "subquery") {
      return this.printSubquery(false);
    }

    this.index++;
    this.contextStack.push(kind);
    const parts = this.printExpressionParts();
    this.contextStack.pop();

    const close = this.consumeClosingBracket();

    // Pattern and grouping brackets hug their contents; only what is inside
    // them may break, and it hangs under the opening bracket.
    if (kind === "relDetail" || kind === "paren" || kind === "quantifier") {
      return group(concat([open, indent(concat(parts)), close]));
    }
    if (parts.length === 0) {
      return open + close;
    }
    return group(
      concat([open, indent(concat([softline, ...parts])), softline, close]),
    );
  }

  private classifyBracket(): GroupKind {
    const token = this.peek()!;
    const previousIndex = this.index - 1;
    const previous = this.tokens[previousIndex];

    if (token.value === "[") {
      return this.patternConnectors.has(previousIndex) ? "relDetail" : "list";
    }
    if (token.value === "{") {
      if (
        previous?.type === "word" &&
        SUBQUERY_KEYWORDS.has(previous.value.toUpperCase()) &&
        !this.isMemberAccess(previousIndex)
      ) {
        return "subquery";
      }
      // ((a)-->(b)){1,3} — a repetition count, not a map
      if (
        previous?.type === "punctuation" &&
        (previous.value === ")" || previous.value === "]")
      ) {
        return "quantifier";
      }
      return "map";
    }
    return previous && this.isCallTarget(previousIndex) ? "call" : "paren";
  }

  private printSubquery(forceBreak: boolean): Doc {
    this.index++; // "{"
    this.contextStack.push("subquery");
    const body = this.printClauses();
    this.contextStack.pop();

    const close = this.consumeClosingBracket();
    if (close === "") {
      return group(concat(["{", indent(concat([line, body]))]), forceBreak);
    }
    return group(
      concat(["{", indent(concat([line, body])), line, close]),
      forceBreak,
    );
  }

  /**
   * Consumes whatever closing bracket is next. Mismatched or missing closers
   * are passed through rather than rejected — a half-typed query should still
   * format.
   */
  private consumeClosingBracket(): string {
    const token = this.peek();
    if (token?.type === "punctuation" && CLOSING_BRACKETS.has(token.value)) {
      this.index++;
      return token.value;
    }
    return "";
  }

  /** Consumes the keyword at the cursor and renders it in the chosen case. */
  private takeKeyword(): string {
    const rendered = this.renderWord(this.index);
    this.index++;
    return rendered;
  }

  private printCase(): Doc {
    const caseKeyword = this.takeKeyword();
    const atCaseKeyword = () =>
      this.peek()?.type === "word" &&
      CASE_KEYWORDS.has(this.peek()!.value.toUpperCase()) &&
      !this.isMemberAccess(this.index);

    const subject = this.printExpressionParts({ stop: atCaseKeyword });
    const branches: Doc[] = [];

    while (this.atWord("WHEN")) {
      const branch: Doc[] = [this.takeKeyword()];
      const condition = this.printExpressionParts({
        stop: () => this.atWord("THEN") || atCaseKeyword(),
      });
      if (condition.length > 0) {
        branch.push(" ", ...condition);
      }
      if (this.atWord("THEN")) {
        branch.push(" ", this.takeKeyword());
        const value = this.printExpressionParts({ stop: atCaseKeyword });
        if (value.length > 0) {
          branch.push(" ", ...value);
        }
      }
      branches.push(group(concat(branch)));
    }

    if (this.atWord("ELSE")) {
      const branch: Doc[] = [this.takeKeyword()];
      const value = this.printExpressionParts({ stop: atCaseKeyword });
      if (value.length > 0) {
        branch.push(" ", ...value);
      }
      branches.push(group(concat(branch)));
    }

    const parts: Doc[] = [caseKeyword];
    if (subject.length > 0) {
      parts.push(" ", ...subject);
    }
    if (branches.length > 0) {
      parts.push(indent(concat(branches.flatMap((branch) => [line, branch]))));
    }
    if (this.atWord("END")) {
      parts.push(line, this.takeKeyword());
    }
    return group(concat(parts));
  }

  /**
   * String literals are opaque unless `parseStrings` is on, in which case a
   * literal that looks like an embedded query (`apoc.periodic.iterate`, ...)
   * is formatted in place.
   */
  private renderString(token: Token): Doc {
    if (!this.options.parseStrings || this.depth >= 2) {
      return token.value;
    }

    const quote = token.value[0];
    if (
      token.value.length < 3 ||
      token.value[token.value.length - 1] !== quote ||
      token.value.includes("\\")
    ) {
      return token.value;
    }

    const inner = token.value.slice(1, -1);
    // Only touch a literal that *begins* like a query, so prose such as
    // 'i like to match socks' is left alone.
    if (
      inner.includes(quote) ||
      !/^\s*(OPTIONAL\s+MATCH|DETACH\s+DELETE|LOAD\s+CSV|MATCH|MERGE|CREATE|RETURN|UNWIND|WITH|CALL|FOREACH|DELETE|REMOVE|SET|INSERT)\b/i.test(
        inner,
      )
    ) {
      return token.value;
    }

    let formatted: string;
    try {
      formatted = formatQuery(inner, this.options, this.depth + 1);
    } catch {
      return token.value;
    }
    // Never rewrite a literal unless every character survived the round trip.
    const significant = (value: string) => value.replace(/\s+/g, "");
    if (
      formatted.length === 0 ||
      significant(formatted).toUpperCase() !== significant(inner).toUpperCase()
    ) {
      return token.value;
    }

    const lines = formatted.split("\n");
    const parts: Doc[] = [quote + lines[0]];
    for (let i = 1; i < lines.length; i++) {
      parts.push(hardline, lines[i]);
    }
    parts.push(quote);
    return concat(parts);
  }
}

function formatQuery(
  query: string,
  options: ResolvedOptions,
  depth: number,
): string {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return "";
  }
  const doc = new Formatter(tokens, options, depth).format();
  return printDocToString(doc, {
    maxWidth: options.maxWidth,
    indentString: options.indentString,
  }).trim();
}

/**
 * Formats a Cypher query.
 *
 * Never throws: malformed or half-written input is passed through as
 * faithfully as possible.
 */
export function beautifyCypher(
  query: string,
  options?: BeautifyOptions,
): string {
  if (typeof query !== "string" || query.trim().length === 0) {
    return "";
  }
  return formatQuery(query, resolveOptions(options), 0);
}

export default beautifyCypher;
