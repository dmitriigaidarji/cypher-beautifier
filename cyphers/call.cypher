MATCH (a:Observing:Process)
  WHERE a.source = 'veeva' AND NOT ()-[:RESPONSIBLE_FOR]->(a)
CALL {
WITH a
MATCH (p:Position {email: a.user_email})<-[h:HELD|HOLDS]-(per:Person)
  WHERE coalesce(h.begin, date('1990-01-01')) <= a.happened <= coalesce(h.
    end, date('2990-01-01'))
WITH p, a
  ORDER BY labels(p) ASC //use Colleague as preferred position if multiple matches exist
  LIMIT 1
RETURN p
}
MERGE (p)-[:RESPONSIBLE_FOR]->(a)