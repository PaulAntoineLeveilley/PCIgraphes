# Création des noeuds antenne à partir de l'API (Limité à 1000 antennes)
```
with "https://data.anfr.fr/api/records/2.0/search/resource_id=88ef0887-6b0f-4d3f-8545-6d64c8f597da&distinct=true&limit=1000&offset=0&sort=%22adr_nm_cp%22" as url
call  apoc.load.json(url) yield value
UNWIND value["result"]["records"] as record
CREATE (a:antenne)
SET a = properties(record)
```

# Ajout des champs longitude et latitude aux antennes pour une meilleure facilité d'utilisation
```
MATCH (a:antenne)
WITH DISTINCT a, a.coordonnees AS unformated_coords
WITH
    a, split(unformated_coords, ',') AS coords
SET a.longitude = toFloat(coords[0])
SET a.latitude = toFloat(coords[1])
RETURN a.longitude, a.latitude
```

# Création d'un lieu par groupement d'antenne sur une même coordonnée
```
MATCH (a:antenne)
WITH DISTINCT a.coordonnees AS unformated_coords
WITH
    split(unformated_coords, ',') AS coords
CREATE (b:lieu {coordonnees: coords, longitude: toFloat(coords[0]), latitude: toFloat(coords[1])})
```

# Création des relations de proximité entre chaque lieux
```
MATCH (a:lieu)
CALL {
    WITH a
    MATCH  (b: lieu)
    WHERE a.coordonnees <> b.coordonnees
    WITH
        b,
        a.coordonnees AS coords_a,
        b.coordonnees AS coords_b
    WITH
        b, coords_a, coords_b,
        point({longitude: toFloat(coords_a[0]), latitude: toFloat(coords_a[1])}) AS pa,
        point({longitude: toFloat(coords_b[0]), latitude: toFloat(coords_b[1])}) AS pb
    RETURN b
    ORDER BY point.distance(pa, pb) ASC
    LIMIT 5
}
MERGE (a)-[:NEAR]-(b)
```

# Connexion des antennes à leur lieu respectif (todo)
```
MATCH (a:antenne)
CALL {
    WITH a
    MATCH (b: lieu)
    WHERE split(a.coordonnees, ",") = b.coordonnees
    RETURN b
}
MERGE (a)-[:AT]->(b)
```

# Évaluation de l'antenne
```
MATCH (a:antenne)
WITH
    a,
    substring(a.generation, 0, 1) as gen
SET a.value = toFloat(gen)/5
RETURN a
```

# Recommendation (Brouillon)
```
CREATE (u:utilisateur)

MATCH (u:utilisateur)
MATCH (l:lieu {coordonnees: ["46.2025"," 5.221388888889"]})
MERGE (u)-[:USES]->(l)

MATCH (u:utilisateur)-[:USES]->(l: lieu)<-[:AT]-(a:antenne)
RETURN a

MATCH (u:utilisateur)-[:USES]->(l1:lieu)-[:NEAR]-(l2:lieu)
MATCH (l1:lieu)<-[:AT]-(a1:antenne)
MATCH (l2:lieu)<-[:AT]-(a2:antenne)
WITH
    *,
    (a1.value/(1+point.distance(point(l1), point(l1)))) as valuation1,
    (a2.value/(1+point.distance(point(l1), point(l2)))) as valuation2
SET a1.valuation1 = valuation1
SET a2.valuation2 = valuation2
RETURN *

MATCH (a:antenne)
WHERE a.valuation IS NOT NULL
WITH a
ORDER BY a.valuation DESC
RETURN a.valuation, a.adm_lb_nom
```
