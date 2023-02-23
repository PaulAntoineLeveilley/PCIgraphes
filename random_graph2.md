Generate a random graph (2e solution)
=======================

```
UNWIND range(1,100) AS id
CREATE (:Node {id: id})
```

```
CALL apoc.periodic.commit("
  MATCH (n1:Node)
  WHERE NOT (n1)-[:RELATION]->()
  WITH n1 LIMIT 1
  MATCH (n2:Node)
  WITH n1, n2, rand() AS r
  ORDER BY r
  LIMIT 1
  WHERE n1 <> n2 AND NOT (n1)-[]-(n2) AND NOT (n2)-[]-(n1)
  CREATE (n1)-[:RELATION {metric_value: toInteger(rand() * 1400) + 100, bandwidth: toInteger(rand() * 50) + 20}] -> (n2)
  CREATE (n2)-[:RELATION {metric_value: toInteger(rand() * 1400) + 100, bandwidth: toInteger(rand() * 50 + 20)}] -> (n1)
  RETURN COUNT(*)
", {iterations:10000000, batchSize:10000000})
```
