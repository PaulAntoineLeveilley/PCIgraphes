const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');

// Set up Neo4j driver
const driver = neo4j.driver('neo4j://localhost:7687/network', neo4j.auth.basic('neo4j', '12345678'));


const query_proj_add = `
  CALL gds.graph.project(
  'network',            
  '*',             
  'REL',
  {
      relationshipProperties: 'metricValue'
  }              
  )
  YIELD
    graphName AS graph, nodeProjection, nodeCount AS nodes, relationshipProjection, relationshipCount AS rels
  `;

const query_proj_delete = `
  CALL gds.graph.drop('network') YIELD graphName;
  `;



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
    CALL gds.shortestPath.dijkstra.stream('network', {
      sourceNode: a,
      targetNode: b,
      relationshipWeightProperty: 'metricValue',
      relationshipTypes: ['REL']
    })
    YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
    RETURN
    index,
    totalCost,
    costs,
    nodes(path) as path
    ORDER BY index
    LIMIT 1
  `;

  // Run query and return results
  const session = driver.session({database: 'network'});
  const res_delete = await session.run(query_proj_delete); 
  const res_add = await session.run(query_proj_add);
  const result = await session.run(query, { startNodeId: parseInt(startNodeId), endNodeId: parseInt(endNodeId) });

  void session.close();

  const paths = {
    path: result.records[0].get('path').map(node => ({
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
    MATCH (a)-[r:REL]->(b) 
    WHERE ID(r) = $edgeId
    CALL apoc.refactor.setType(r,'REL_OFF') YIELD output
    RETURN output
  `;

  // Run query and return success or failure message
  const session = driver.session({database: 'network'});
  const result = await session.run(query, { edgeId: parseInt(edgeId) });
  void session.close();

  if (result.records.length === 1) {
    res.send('Edge deactivated successfully.');
  } else {
    res.status(500).send('Failed to deactivate edge.');
  }

});

/**
 * @swagger
 * /activate-edge/{edgeId}:
 *   put:
 *     summary: Activate a single edge.
 *     parameters:
 *       - name: edgeId
 *         in: path
 *         required: true
 *         description: The ID of the edge.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: The edge was activated successfully.
 *       '500':
 *         description: Failed to activate the edge.
 */
router.put('/activate-edge/:edgeId', async (req, res) => {
  const edgeId = req.params.edgeId;

  // Define Cypher query
  const query = `
    MATCH (a)-[r:REL_OFF]->(b) 
    WHERE ID(r) = $edgeId
    CALL apoc.refactor.setType(r,'REL') YIELD output
    RETURN output
  `;

  // Run query and return success or failure message
  const session = driver.session({database: 'network'});
  const result = await session.run(query, { edgeId: parseInt(edgeId) });
  void session.close();

  if (result.records.length === 1) {
    res.send('Edge activated successfully.');
  } else {
    res.status(500).send('Failed to activate edge.');
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

/**
 * @swagger
 * /saturated:
 *   get:
 *     summary: Get the saturated edges.
 *     responses:
 *       '200':
 *         description: The saturated edges.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
router.get('/saturated', async (req, res) => {
  // Define Cypher query
  const query = `
    MATCH (n)-[r]->()
    WHERE 
    WITH r.bandwidth > 100
    RETURN collect(DISTINCT {id: id(r), startNodeId: id(startNode(r)), endNodeId: id(endNode(r)), bandwidth: r.bandwidth, metricValue: r.metricValue}) as edges
  `;

  // Run query and return results
  const session = driver.session({database: 'network'});
  const result = await session.run(query);
  void session.close();

  const edges = result.records[0].get('edges').map(edge => ({
    id: edge.id.toNumber(),
    startNode: edge.startNodeId.toNumber(),
    endNode: edge.endNodeId.toNumber(),
    bandwidth: edge.bandwidth.toNumber(),
    metricValue: edge.metricValue.toNumber()
  }));

  res.send({ edges });
});



module.exports = router;
