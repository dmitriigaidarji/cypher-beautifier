import "./style.css";
import beautifyCypher from "../lib/index.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div>${beautifyCypher("MATCH   p=()-() RETURN p limit 10;")
      .split("\n")
      .map((t) => `<p>${t}</p>`)}</div>
    <h1>Cypher Beautifier</h1>
  </div>
`;
