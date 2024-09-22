import { expect, test } from "vitest";
import beautifyCypher from "./index.js";

const f = beautifyCypher;
test("Keywords have spaces", () => {
  expect(f("MATCH ()--()")).toBe("MATCH ()--()");
});
test("No spaces for :", () => {
  expect(f("MATCH (a   :  SomeLabel { p: 1  })--()")).toBe(
    "MATCH (a: SomeLabel { p: 1 })--()",
  );
});
test("Keywords are on new lines", () => {
  expect(f("MATCH (a)--() return a limit 1")).toBe(
    "MATCH (a)--()\nRETURN a\nLIMIT 1",
  );
});

// test("s1", () => {
//   const q = `MERGE (sm:SiteMaterial {node_key: 'SM_'+ coalesce(row.material,'Unknown') + '_' + coalesce(row.site,'Unknown')})
// ON CREATE
// \tSET sm.material_id = row.material,sm.site_id = row.site,
// \t\tsm.updated_on = datetime()
//
// MERGE (sdi)-[:SPECIFIES]->(sm)
//
// MERGE (material:Material {node_key: 'MAT_'+coalesce(row.material,'Unknown') })
//     ON CREATE
//     \tSET material.material_id = coalesce(row.material,'Unknown'),
//     \t\tmaterial.updated_on = datetime()
//
// MERGE (sm)-[:COMPOSED_OF]->(material)
//
// MERGE (inventory:Warehouse:Inventory {node_key: 'WHS_'+ coalesce(row.batch,'Unknown') + '_' + coalesce(row.material,'Unknown') + '_' + coalesce(row.site,'Unknown')})
// ON CREATE
// \t\tSET inventory.batch_id =  row.batch,
// \t\t\tinventory.material_id = row.material,
// \t\t\tinventory.site_id = row.site,
// \t\t\tinventory.updated_on = datetime()`;
//   expect(f(q)).toBe(q.replace(/\t/g, ""));
// });
