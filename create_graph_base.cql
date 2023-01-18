// lire les entrées du csv et créer un noeud de type antenne par ligne, en lui attribuant les bons... ...atributs!
LOAD CSV WITH HEADERS FROM "file:///20230106100009_observatoire_2g_3g_4g.csv" AS row FIELDTERMINATOR ';' 
WITH row, keys(row) AS keys
LIMIT 100
CREATE (node:Antenne)
SET node = row
RETURN node
// créer les noeuds de type lieu
LOAD CSV WITH HEADERS FROM 'file:///20230106100009_observatoire_2g_3g_4g.csv' AS row FIELDTERMINATOR ';'
WITH DISTINCT row.coordonnees as coordonnees
LIMIT 100
CREATE (node:Lieu {coordonnees: coordonnees})
RETURN node
// créer la relation "se trouve" entre un noeud antenne et un noeud lieu ssi les champs coordonnées correspondent
MATCH (antenne:Antenne), (lieu:Lieu {coordonnees: antenne.coordonnees})
CREATE (antenne)-[:SE_TROUVE]->(lieu)
// Afficher l'ensemble du graphe
MATCH (n)
OPTIONAL MATCH (n)-[r]->()
RETURN n,r

