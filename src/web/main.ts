import "./style.css";
import beautifyCypher from "../lib/index.ts";

const input = document.getElementById("input") as HTMLTextAreaElement;

const output = document.getElementById("output") as HTMLTextAreaElement;

function beautify() {
  output.value = beautifyCypher(input.value);
}

input.addEventListener("input", () => {
  beautify();
});

input.value = `
MERGE (sm:SiteMaterial {node_key: 'SM_'+ coalesce(row.material,'Unknown') + '_' + coalesce(row.site,'Unknown')})
ON CREATE
\tSET sm.material_id = row.material,sm.site_id = row.site,
\t\tsm.updated_on = datetime()

MERGE (sdi)-[:SPECIFIES]->(sm)

MERGE (material:Material {node_key: 'MAT_'+coalesce(row.material,'Unknown') })
    ON CREATE
    \tSET material.material_id = coalesce(row.material,'Unknown'),
    \t\tmaterial.updated_on = datetime()

MERGE (sm)-[:COMPOSED_OF]->(material)

MERGE (inventory:Warehouse:Inventory {node_key: 'WHS_'+ coalesce(row.batch,'Unknown') + '_' + coalesce(row.material,'Unknown') + '_' + coalesce(row.site,'Unknown')})
ON CREATE
\t\tSET inventory.batch_id =  row.batch,
\t\t\tinventory.material_id = row.material,
\t\t\tinventory.site_id = row.site,
\t\t\tinventory.updated_on = datetime()
return {qwe: inventory.batch_id, asd: inventory.updated_on}
`;

beautify();
