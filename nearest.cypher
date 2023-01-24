MATCH
    (a: A {id: 593})
CALL {
    WITH a
    MATCH  (b: A)
    WITH
        b,
        split(a.coordonnees, ',') AS coords_a,
        split(b.coordonnees, ',') AS coords_b
    WITH
        b, coords_a, coords_b,
        point({longitude: toFloat(coords_a[0]), latitude: toFloat(coords_a[1])}) AS pa,
        point({longitude: toFloat(coords_b[0]), latitude: toFloat(coords_b[1])}) AS pb
    RETURN b, pa, pb
    ORDER BY point.distance(pa, pb) ASC
    LIMIT 5
}
RETURN pa,pb
