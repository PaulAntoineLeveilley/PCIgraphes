# Création des noeuds antenne à partir de l'API
```
with "https://data.anfr.fr/api/records/2.0/downloadfile/format=json&resource_id=88ef0887-6b0f-4d3f-8545-6d64c8f597da" as url
call  apoc.load.json(url) yield value
UNWIND value["records"] as record
CREATE (a:antenne)
SET a = record["fields"]
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
        split(a.coordonnees, ',') AS coords_a,
        split(b.coordonnees, ',') AS coords_b
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
    WHERE a.coordonnees = b.coordonnees
    RETURN b
}
MERGE (a)-[:AT]->(b)
```

# Recommendation (Brouillon)
```
CREATE (u:utilisateur {coordonnees: ""})

MATCH (u:utilisateur)
WITH u
MATCH (a:antenne {id: 500})
MERGE (u)-[:USES]->(a)

MATCH (u:utilisateur)-[:USES]->(a: antenne)-[:AT]->(l:lieu)<-[:AT]-(b:antenne)
RETURN b

```
