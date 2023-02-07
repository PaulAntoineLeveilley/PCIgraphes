with "https://data.anfr.fr/api/records/2.0/search/resource_id=88ef0887-6b0f-4d3f-8545-6d64c8f597da&distinct=true&limit=100&offset=0" as url
call  apoc.load.json(url) yield value
UNWIND value["result"]["records"] as record
CREATE (a:antenne)
SET a = properties(record)

MATCH (a:antenne)
WITH DISTINCT a.coordonnees AS unformated_coords,
                a.sta_nm_dpt AS departement
WITH
    split(unformated_coords, ',') AS coords, departement
CREATE (b:lieu {coordonnees: coords, longitude: toFloat(coords[0]), latitude: toFloat(coords[1]), dep: departement})

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

MATCH (a:antenne)
CALL {
    WITH a
    MATCH (b: lieu)
    WHERE split(a.coordonnees, ",") = b.coordonnees
    RETURN b
}
MERGE (a)-[:AT]->(b)

MATCH (l:lieu)
WITH DISTINCT l.dep AS depart
CREATE (b:departement {num: depart})

MATCH (d:departement)
CALL {
    WITH d
    MATCH (l:lieu)
    WHERE l.dep = d.num
    RETURN l
}
MERGE (l)-[:IN]->(d)

CREATE (p:Pays{nom: "FRANCE"}) 

MATCH (d:departement)
WITH d
MATCH (p:Pays)
MERGE (d)-[:INN]->(p)