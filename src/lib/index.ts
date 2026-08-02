// Type-only exports are erased at build time, so the runtime surface stays a
// single default export. That keeps `require("cypher-beautifier")` returning
// the function itself, as it always has.
export type {
  BeautifyOptions,
  /** @deprecated renamed to BeautifyOptions */
  BeautifyOptions as IProps,
  KeywordCase,
} from "./formatter";

export { default } from "./formatter";
