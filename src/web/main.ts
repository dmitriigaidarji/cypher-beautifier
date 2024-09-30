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

// input.value = `
// MATCH (a:Observing:Process)
// WHERE a.source = 'veeva'
// AND NOT ()-[:RESPONSIBLE_FOR]->(a)
// call {
//     WITH a
//     MATCH (p:Position {email:a.user_email}) <-[h:HELD|HOLDS]-(per:Person)
//     WHERE coalesce(h.begin,date('1990-01-01')) <= a.happened <= coalesce(h.end,date('2990-01-01'))
//     WITH p, a
//     ORDER BY labels(p) asc //use Colleague as preferred position if multiple matches exist
//     LIMIT 1
//     RETURN p
// }
// MERGE (p)-[:RESPONSIBLE_FOR]->(a)
// `;
//
// input.value = `
// UNWIND $parameters as row MERGE (c:CAPAConfirming:Process {investigation_id: row.investigation_id, node_key : 'CAPACF_'+row.activity_id+'_'+row.investigation_id})
// SET c.happened = date(row.capa_set_date), c.activity_id = row.activity_id,
// c.capa_required = row.capa_required,
// c.performed_by_name = row.full_name,
// c.user_email = row.email,
// c.site_id = row.sap_plant_code,
// c.dmaic_stage = "measure/analyse",
// c.source = 'veeva',
// c.updated_on = datetime()
// WITH row, c
// MATCH (p:Position {email:c.user_email})<-[h:HELD|HOLDS]-(per:Person) WHERE coalesce(h.begin,date('1990-01-01')) <= date(row.capa_set_date) <= coalesce(h.end,date('2990-01-01')) WITH p, c, case when 'Colleague' in labels(p) then 1 else 2 end as sorted
// ORDER BY sorted asc //use Colleague as preferred position if multiple matches exist
// LIMIT 1
// MERGE (p) - [r1:PERFORMS] -> (c)
// `;
//
// input.value = `
// CALL apoc.periodic.iterate(
// "MATCH (r:Reporting:Process)
// MATCH (p:Position {email:r.user_email}) <-[h:HELD|HOLDS]-(per:Person)
// WHERE r.source = 'veeva'
// AND NOT (p)-[:SQA_CONTACT_FOR]->(r)
// AND coalesce(h.begin,date('1990-01-01')) <= r.happened <= coalesce(h.end,date('2990-01-01'))
// WITH p, r, case when 'Colleague' in labels(p) then 1 else 2 end as sorted
// ORDER BY sorted asc //use Colleague as preferred position if multiple matches exist
// LIMIT 1
// return r, p",
// "MERGE (p)-[:SQA_CONTACT_FOR]->(r)",
// {batchSize:2000, parallel:false})
// `;
// input.value = `match (c:Customer {customer_id:'test'})-[]-(m:Material) where c.customer_name is null and c.customer_country starts with 'E' return c limit 500`;
//
// input.value = `
// CYPHER RUNTIME = PARALLEL
//     MATCH (o:SalesOrder)-[:CONTAINS]->(soi:SalesOrderItem)-[:SETS_SHIP_TO]->(cm:CustomerMaterial) <-[:CONSUMES]-(c:Customer)
//         WHERE o.actual_doc_date IS NOT NULL
//         AND o.actual_doc_date >=  date('2024-01-01')
//         AND o.actual_doc_date <=  date('2024-03-01')
//         AND o.sales_doc_cat = 'C'
//         AND o.sales_order_type in ['ZOR', 'ZC','ZFR','ZN']
//         WITH DISTINCT o,c
//         WHERE NOT EXISTS {(:SdDailySummary {summary_date:o.actual_doc_date})-[:SUMMARIZES]->(c)}
//        with o.actual_doc_date  AS dt, elementId(c) as cid
//
//
//     MATCH (ma:Material)<-[:COMPOSED_OF]-(m:SiteMaterial)<-[:SPECIFIES]-(soi:SalesOrderItem)<-[:CONTAINS]-(o:SalesOrder)
//     MATCH (soi)-[:SETS_SHIP_TO]->(cm:CustomerMaterial)<-[:CONSUMES]-(c:Customer)
//         //executive dashboard filters
//         WHERE o.sales_order_type in ['ZOR', 'ZC','ZFR','ZN']
//             AND o.sales_doc_cat = 'C'
//             AND o.ship_to_external_flag = 1
//             AND soi.rejection_reason IS NULL
//             AND o.overall_order_status = 'C'
//         AND o.actual_doc_date = dt
//         AND elementId(c) = cid
//     WITH soi, o, m, c, ma
//     OPTIONAL MATCH (soi)-[:GENERATES]->(di:DeliveryItem)<-[:CONTAINS]-(d:Delivery)
//         //executive dashboard filters
//         WHERE d.delivery_type in ['ZDL', 'ZND', 'ZELF']
//             AND d.sales_doc_cat = 'J'
//             AND di.goods_movement_status = 'C'
//     WITH
//         //deduplicate orders for one to many match with deliveries
//         soi.node_key as sid,
//         min(soi.price_per_unit_imputed) as ppui,
//         min(soi.order_qty_buom ) as oqb,
//         min(soi.price_per_unit_converted) as ppuc,
//         sum(di.actual_quantity_delivered) as aqd,
//         max(di.goods_movement_status) as goods_movement_status,
//         min(di.buom) as delivery_buom,
//         min(soi.buom) as order_buom,
//         coalesce(c.customer_id,'Unknown') as cust,
//         o.actual_doc_date as dt,
//         coalesce(ma.mpg,'Unknown') as mpg ,
//         coalesce(ma.product_desc,'Unknown') as product_desc,
//         min(o.ntid) as user
//   return
//         //aggregate orders and deliveries
//         round(sum(ppui*oqb)) as forecasted,
//         round(sum(ppui*aqd)) as actual,
//         round(sum(ppuc*oqb)) as forecasted_no_impute,
//         round(sum(ppuc*aqd)) as actual_no_impute,
//         sum(aqd) as  total_actual_quantity_delivered,
//         sum(case when goods_movement_status = 'C' then 0 else aqd end) as  total_incomplete_delivery_quantity,
//         sum(oqb) as  total_order_qty_buom,
//         min(delivery_buom) as delivery_buom,
//         min(order_buom) as order_buom,
//         cust,
//         dt,
//         mpg ,
//         user,
//         product_desc,
//        case when dt >= date('2026-01-01') and dt <= date('2026-06-30') then 'S1 2026'
//             when dt >= date('2025-07-01') and dt <= date('2025-12-31') then 'S2 2025'
//             when dt >= date('2025-01-01') and dt <= date('2025-06-30') then 'S1 2025'
//             when dt >= date('2024-07-01') and dt <= date('2024-12-31') then 'S2 2024'
//             when dt >= date('2024-01-01') and dt <= date('2024-06-30') then 'S1 2024'
//             when dt >= date('2023-07-01') and dt <= date('2023-12-31') then 'S2 2023'
//             when dt >= date('2023-01-01') and dt <= date('2023-06-30') then 'S1 2023'
//             when dt >= date('2022-07-01') and dt <= date('2022-12-31') then 'S2 2022'
//             when dt >= date('2022-01-03') and dt <= date('2022-06-30') then 'S1 2022'
//             when dt >= date('2021-07-05') and dt <= date('2022-01-02') then 'S2 2021'
//             when dt >= date('2021-01-04') and dt <= date('2021-07-04') then 'S1 2021'
//             when dt >= date('2020-07-01') and dt <= date('2021-01-03') then 'S2 2020'
//             else 'Other'
//         end as semester,
//        case when dt >= date('2025-07-01') and dt <= date('2026-06-30') then '2026'
//             when dt >= date('2024-07-01') and dt <= date('2025-06-30') then '2025'
//             when dt >= date('2024-01-01') and dt <= date('2024-06-30') then '2024'
//             when dt >= date('2023-07-01') and dt <= date('2023-12-31') then '2023'
//             when dt >= date('2023-01-01') and dt <= date('2023-06-30') then '2023'
//             when dt >= date('2022-07-01') and dt <= date('2022-12-31') then '2022'
//             when dt >= date('2022-01-03') and dt <= date('2022-06-30') then '2022'
//             when dt >= date('2021-07-05') and dt <= date('2022-01-02') then '2021'
//             when dt >= date('2021-01-04') and dt <= date('2021-07-04') then '2021'
//             when dt >= date('2020-07-01') and dt <= date('2021-01-03') then '2020'
//             else 'Other'
//         end as year
//
// `;
// input.value = `
// //  brand_tags_drawing_via_component
// MATCH (co:Component)
//   MATCH (b:Brand) WHERE "Drawing" in b.tags
//   WITH b, co,
//       [b in b.aliases | replace(replace(replace(toUpper(b),'[','\\['),':','\\:*'),'|','')] as aliases
//   WHERE co.component_desc is not null
//   AND co.material_id is not null
//   AND any(a IN aliases WHERE co.component_desc  =~ '.*(^|\\\\W)' + a + '($|\\\\W).*')
// WITH b, co, [a IN aliases WHERE co.component_desc =~ '.*(^|\\\\W)' + a + '($|\\\\W).*'] as matched_aliases_
// WITH b, co, [m IN matched_aliases_ | replace(m,'\\\\','')] as matched_aliases
// match (d:Drawing)-[:INCLUDES]->(co)
// MERGE (b)-[t:TAGS]->(d)
//   SET t.matched_aliases = apoc.coll.union(t.matched_aliases, matched_aliases),
//       t.reason = "Drawing's components material name matches brand category aliases"`;
// beautify();

// input.value = `
// CALL apoc.periodic.iterate(
// "MATCH (r:Reporting:Process)
// MATCH (p:Position {email:r.user_email}) <-[h:HELD|HOLDS]-(per:Person)
// WHERE r.source = 'veeva'
// AND NOT (p)-[:SQA_CONTACT_FOR]->(r)
// AND coalesce(h.begin,date('1990-01-01')) <= r.happened <= coalesce(h.end,date('2990-01-01'))
// WITH p, r, case when 'Colleague' in labels(p) then 1 else 2 end as sorted
// ORDER BY sorted asc //use Colleague as preferred position if multiple matches exist
// LIMIT 1
// return r, p",
// "MERGE (p)-[:SQA_CONTACT_FOR]->(r)",
// {batchSize:2000, parallel:false}) RETURN {a:1,b:2,   c:3}`;
beautify();
