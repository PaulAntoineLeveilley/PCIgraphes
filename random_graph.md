Generate a random graph
=======================

```
CALL gds.beta.graph.generate("network", 50, 2)
YIELD name, nodes, relationships, generateMillis, relationshipSeed, averageDegree, relationshipDistribution, relationshipProperty

CALL gds.graph.export('network', { dbName: 'network' })

:use system

CREATE DATABASE network

:use network

MATCH ()-[e]->()
SET e.metricValue = toInteger(rand() * 1400) + 100,
    e.bandwidth = toInteger(rand() * 50) + 20
```
