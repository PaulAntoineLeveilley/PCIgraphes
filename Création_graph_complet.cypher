with "https%3A%2F%2Fdata.anfr.fr%2Fapi%2Frecords%2F2.0%2Fdownloadfile%2Fformat%3Djson%26resource_id%3D88ef0887-6b0f-4d3f-8545-6d64c8f597da&h=AT3Ju3B2oSnf-7IsgI4F3_ynu_HQUuEf39qtoTzwBuLmcSjlPDXxiUPLNui6jtX2MRkj7qoh5OLGh0ZYaI9HAbOKCQVVT4xnxxjQ88gJ03Xa_C9Lauha4iZjTB_d7ihjr7CZ7Q" as url
call  apoc.load.json(url) yield value
UNWIND value["records"] as record
CREATE (a:antenne)
SET a = record["fields"]
WITH a
MATCH (a:antenne)
CALL {
    WITH a
    MATCH  (b: antenne)
    WHERE a.id <> b.id
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
