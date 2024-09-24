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

// input.value = `
// CYPHER RUNTIME = PARALLEL
//     MATCH (o:SalesOrder)-[:CONTAINS]->(soi:SalesOrderItem)-[:SETS_SHIP_TO]->(cm:CustomerMaterial) <-[:CONSUMES]-(c:Customer)
//         WHERE o.actual_doc_date IS NOT NULL AND o.actual_doc_date >=  date('2024-01-01') AND o.actual_doc_date <=  date('2024-03-01')
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
//         sum( case when goods_movement_status = 'C' then 0 else aqd end) as  total_incomplete_delivery_quantity,
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
//
// beautify();
