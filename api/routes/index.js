const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

// Set up Neo4j driver
const driver = neo4j.driver('neo4j://localhost:7687/network', neo4j.auth.basic('neo4j', '12345678'));

/**
 * @swagger
 * /shortest-path/{startNode}/{endNode}:
 *   get:
 *     summary: Get the shortest path between two nodes.
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
 *         description: The ordered list of nodes that constitute the shortest path.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   path:
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
    WHERE ID(a) = $startNodeId
    MATCH (b)
    WHERE ID(b) = $endNodeId
    MATCH p = shortestPath((a)-[*]-(b))
    RETURN collect(nodes(p)) as path
  `;

  // Run query and return results
  const session = driver.session({database: 'network'});
  const result = await session.run(query, { startNodeId: parseInt(startNodeId), endNodeId: parseInt(endNodeId) });
  void session.close();

  const paths = {
    path: result.records[0].get('path')[0].map(node => ({
      id: node.identity.toNumber()
    })),
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
  void session.close();

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
  void session.close();

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
