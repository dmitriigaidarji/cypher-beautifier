/**
 * A tiny Wadler-style document model, the same idea Prettier uses.
 *
 * The formatter never decides where to put line breaks directly. It builds a
 * tree of `Doc` nodes that describe *where breaks are allowed*, and this
 * printer picks the flattest rendering that still fits inside `maxWidth`.
 */

export type Doc =
  | string
  | DocConcat
  | DocGroup
  | DocIndent
  | DocLine
  | DocLineSuffix
  | DocBreakParent;

interface DocConcat {
  type: "concat";
  parts: Doc[];
}
interface DocGroup {
  type: "group";
  contents: Doc;
  shouldBreak: boolean;
}
interface DocIndent {
  type: "indent";
  contents: Doc;
}
interface DocLine {
  type: "line";
  /** renders as "" when flat, a newline when broken */
  soft: boolean;
  /** always renders as a newline */
  hard: boolean;
}
interface DocLineSuffix {
  type: "line-suffix";
  contents: Doc;
}
interface DocBreakParent {
  type: "break-parent";
}

export function concat(parts: Doc[]): Doc {
  return { type: "concat", parts };
}

export function group(contents: Doc, shouldBreak = false): Doc {
  return { type: "group", contents, shouldBreak };
}

export function indent(contents: Doc): Doc {
  return { type: "indent", contents };
}

/** A space when the enclosing group is flat, a newline when it is broken. */
export const line: Doc = { type: "line", soft: false, hard: false };
/** Nothing when the enclosing group is flat, a newline when it is broken. */
export const softline: Doc = { type: "line", soft: true, hard: false };
/** Always a newline. Forces every enclosing group to break. */
export const hardline: Doc = { type: "line", soft: false, hard: true };
/** Forces every enclosing group to break without emitting anything. */
export const breakParent: Doc = { type: "break-parent" };

/**
 * Defers `contents` to just before the next line break, and makes it weigh
 * nothing when deciding whether a line fits. This is how a trailing `// ...`
 * comment stays glued to its line without pushing the code in front of it
 * onto extra lines.
 */
export function lineSuffix(contents: Doc): Doc {
  return { type: "line-suffix", contents };
}

/** True when a doc can never emit anything, so callers can drop separators. */
export function isEmptyDoc(doc: Doc): boolean {
  if (typeof doc === "string") {
    return doc.length === 0;
  }
  switch (doc.type) {
    case "concat":
      return doc.parts.every(isEmptyDoc);
    case "group":
    case "indent":
    case "line-suffix":
      return isEmptyDoc(doc.contents);
    case "break-parent":
      return true;
    case "line":
      return false;
  }
}

const MODE_BREAK = 1;
const MODE_FLAT = 2;

/**
 * Marks every group that (transitively) contains a hard break, so the printer
 * does not waste time measuring something that can never fit on one line.
 */
function propagateBreaks(doc: Doc): boolean {
  if (typeof doc === "string") {
    return doc.includes("\n");
  }
  switch (doc.type) {
    case "concat": {
      let forced = false;
      for (const part of doc.parts) {
        if (propagateBreaks(part)) {
          forced = true;
        }
      }
      return forced;
    }
    case "indent":
      return propagateBreaks(doc.contents);
    case "group": {
      if (propagateBreaks(doc.contents)) {
        doc.shouldBreak = true;
      }
      return doc.shouldBreak;
    }
    case "line":
      return doc.hard;
    case "line-suffix":
      // Deferred content never forces a break on its own; callers pair it
      // with an explicit breakParent when they need one.
      return false;
    case "break-parent":
      return true;
  }
}

type Command = [number, number, Doc];

function fits(next: Command, restCommands: Command[], remaining: number) {
  const commands: Command[] = [next];
  let restIndex = restCommands.length;

  while (remaining >= 0) {
    if (commands.length === 0) {
      if (restIndex === 0) {
        return true;
      }
      commands.push(restCommands[--restIndex]);
      continue;
    }

    const [level, mode, doc] = commands.pop()!;

    if (typeof doc === "string") {
      // A string that carries its own newline (a block comment) ends the
      // measurement: everything after it starts on a fresh line anyway.
      if (doc.includes("\n")) {
        return false;
      }
      remaining -= doc.length;
      continue;
    }

    switch (doc.type) {
      case "concat":
        for (let i = doc.parts.length - 1; i >= 0; i--) {
          commands.push([level, mode, doc.parts[i]]);
        }
        break;
      case "indent":
        commands.push([level + 1, mode, doc.contents]);
        break;
      case "group":
        commands.push([
          level,
          doc.shouldBreak ? MODE_BREAK : mode,
          doc.contents,
        ]);
        break;
      case "line":
        if (mode === MODE_BREAK || doc.hard) {
          return true;
        }
        if (!doc.soft) {
          remaining -= 1;
        }
        break;
      case "line-suffix":
      case "break-parent":
        break;
    }
  }

  return false;
}

function trimTrailingSpaces(out: string[]) {
  while (out.length > 0) {
    const trimmed = out[out.length - 1].replace(/[ \t]+$/, "");
    if (trimmed.length > 0) {
      out[out.length - 1] = trimmed;
      return;
    }
    out.pop();
  }
}

export interface PrintOptions {
  maxWidth: number;
  indentString: string;
}

export function printDocToString(doc: Doc, options: PrintOptions): string {
  propagateBreaks(doc);

  const out: string[] = [];
  const commands: Command[] = [[0, MODE_BREAK, doc]];
  let lineSuffixes: Command[] = [];
  let width = 0;

  while (commands.length > 0) {
    const [level, mode, current] = commands.pop()!;

    if (typeof current === "string") {
      out.push(current);
      const lastNewline = current.lastIndexOf("\n");
      width =
        lastNewline === -1
          ? width + current.length
          : current.length - lastNewline - 1;
      continue;
    }

    switch (current.type) {
      case "concat":
        for (let i = current.parts.length - 1; i >= 0; i--) {
          commands.push([level, mode, current.parts[i]]);
        }
        break;

      case "indent":
        commands.push([level + 1, mode, current.contents]);
        break;

      case "break-parent":
        break;

      case "group": {
        if (mode === MODE_FLAT && !current.shouldBreak) {
          commands.push([level, MODE_FLAT, current.contents]);
          break;
        }
        if (current.shouldBreak) {
          commands.push([level, MODE_BREAK, current.contents]);
          break;
        }
        const flat: Command = [level, MODE_FLAT, current.contents];
        commands.push(
          fits(flat, commands, options.maxWidth - width)
            ? flat
            : [level, MODE_BREAK, current.contents],
        );
        break;
      }

      case "line-suffix":
        lineSuffixes.push([level, mode, current.contents]);
        break;

      case "line": {
        // Anything deferred to the end of this line has to come out first.
        if (lineSuffixes.length > 0) {
          commands.push([level, mode, current]);
          for (let i = lineSuffixes.length - 1; i >= 0; i--) {
            commands.push(lineSuffixes[i]);
          }
          lineSuffixes = [];
          break;
        }
        if (mode === MODE_FLAT && !current.hard) {
          if (!current.soft) {
            out.push(" ");
            width += 1;
          }
          break;
        }
        trimTrailingSpaces(out);
        const padding = options.indentString.repeat(level);
        out.push("\n" + padding);
        width = padding.length;
        break;
      }
    }

    if (commands.length === 0 && lineSuffixes.length > 0) {
      for (let i = lineSuffixes.length - 1; i >= 0; i--) {
        commands.push(lineSuffixes[i]);
      }
      lineSuffixes = [];
    }
  }

  trimTrailingSpaces(out);
  return out.join("");
}
