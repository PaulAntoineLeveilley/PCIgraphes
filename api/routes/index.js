var express = require('express');
var router = express.Router();
var neo4j = require('neo4j-driver');

// Set up Neo4j driver
var driver = neo4j.driver('neo4j://localhost:7687/network', neo4j.auth.basic('neo4j', '12345678'));

/**
 * @swagger
 * /shortest-path/{startNode}/{endNode}:
 *   get:
 *     summary: Get 2 shortest paths between two nodes.
 *     parameters:
 *       - name: startNode
 *         in: path
 *         required: true
 *         description: The ID of the start node.
 *         schema:
 *           type: integer
 *       - name: endNode
 *         in: path
 *         required: true
 *         description: The ID of the end node.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A list of 2 shortest paths.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   path1:
 *                     type: array
 *                     items:
 *                       type: object
 *                   path2:
 *                     type: array
 *                     items:
 *                       type: object
 */
router.get('/shortest-path/:startNode/:endNode', async (req, res) => {
  const startNodeId = req.params.startNode;
  const endNodeId = req.params.endNode;

  // Define Cypher query
  const query = `
    MATCH (a)
    WHERE ID(a) = 12
    MATCH (b)
    WHERE ID(b) = 43
    MATCH p1 = shortestPath((a)-[*]-(b))
    MATCH p2 = shortestPath((a)-[*]-(b))
    RETURN collect(nodes(p1)) as path1, collect(nodes(p2)) as path2
  `;

  // Run query and return results
  const session = driver.session({database: 'network'});
  const result = await session.run(query, { startNodeId, endNodeId });
  session.close();

  const paths = {
    path1: result.records[0].get('path1')[0].map(node => ({
      id: node.identity.toNumber()
    })),
    path2: result.records[0].get('path2')[0].map(node => ({
      id: node.identity.toNumber()
    }))
  };

  res.send(paths);
});

/**
 * @swagger
 * /deactivate-edge/{edgeId}:
 *   put:
 *     summary: Deactivate a single edge.
 *     parameters:
 *       - name: edgeId
 *         in: path
 *         required: true
 *         description: The ID of the edge.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: The edge was deactivated successfully.
 *       '500':
 *         description: Failed to deactivate the edge.
 */
router.put('/deactivate-edge/:edgeId', async (req, res) => {
  const edgeId = req.params.edgeId;

  // Define Cypher query
  const query = `
    MATCH (a)-[r]->(b)
    WHERE id(r) = $edgeId
    SET r.active = false
    RETURN r
  `;

  // Run query and return success or failure message
  const session = driver.session({database: 'network'});
  const result = await session.run(query, { edgeId });
  session.close();

  if (result.summary.counters.relationshipsUpdated() === 1) {
    res.send('Edge deactivated successfully.');
  } else {
    res.status(500).send('Failed to deactivate edge.');
  }
});

/**
 * @swagger
 * /graph:
 *   get:
 *     summary: Get the whole graph.
 *     responses:
 *       '200':
 *         description: The whole graph.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nodes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                 edges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       startNode:
 *                         type: integer
 *                       endNode:
 *                         type: integer
 *                       bandwidth:
 *                         type: integer
 *                       metricValue:
 *                         type: integer
 */
router.get('/graph', async (req, res) => {
  // Define Cypher query
  const query = `
    MATCH (n)-[r]->()
    WITH n, r
    RETURN collect(DISTINCT {id: id(n)}) as nodes, collect(DISTINCT {id: id(r), startNodeId: id(startNode(r)), endNodeId: id(endNode(r)), bandwidth: r.bandwidth, metricValue: r.metricValue}) as edges
  `;

  // Run query and return results
  const session = driver.session({database: 'network'});
  const result = await session.run(query);
  session.close();

  const nodes = result.records[0].get('nodes').map(node => ({
    id: node.id.toNumber()
  }));
  const edges = result.records[0].get('edges').map(edge => ({
    id: edge.id.toNumber(),
    startNode: edge.startNodeId.toNumber(),
    endNode: edge.endNodeId.toNumber(),
    bandwidth: edge.bandwidth.toNumber(),
    metricValue: edge.metricValue.toNumber()
  }));

  res.send({ nodes, edges });
});

module.exports = router;
