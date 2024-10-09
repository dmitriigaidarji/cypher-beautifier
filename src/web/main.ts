import "./style.css";
import beautifyCypher from "../lib/index.ts";

const input = document.getElementById("input") as HTMLTextAreaElement;

const output = document.getElementById("output") as HTMLTextAreaElement;

const parseStringsCheckbox = document.getElementById(
  "parse-strings",
) as HTMLInputElement;

parseStringsCheckbox.onchange = () => {
  beautify();
};

input.addEventListener("input", () => {
  beautify();
});

function beautify() {
  output.value = beautifyCypher(input.value, {
    parseStrings: parseStringsCheckbox.checked,
  });
}
