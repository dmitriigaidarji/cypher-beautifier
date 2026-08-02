import "./style.css";
import beautifyCypher from "../lib/index.ts";
import type { KeywordCase } from "../lib/index.ts";

const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;

const parseStringsCheckbox = document.getElementById(
  "parse-strings",
) as HTMLInputElement;
const keywordCaseSelect = document.getElementById(
  "keyword-case",
) as HTMLSelectElement;
const indentInput = document.getElementById("indent") as HTMLInputElement;
const maxWidthInput = document.getElementById("max-width") as HTMLInputElement;

const controls = [
  parseStringsCheckbox,
  keywordCaseSelect,
  indentInput,
  maxWidthInput,
];

function beautify() {
  output.value = beautifyCypher(input.value, {
    parseStrings: parseStringsCheckbox.checked,
    keywordCase: keywordCaseSelect.value as KeywordCase,
    indent: Number(indentInput.value),
    maxWidth: Number(maxWidthInput.value),
  });
}

input.addEventListener("input", beautify);
for (const control of controls) {
  control.addEventListener("change", beautify);
}

beautify();
