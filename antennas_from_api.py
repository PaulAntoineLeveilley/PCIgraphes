import requests
from neo4j import GraphDatabase

NEO4J_URI = "neo4j+s://0df1642b.databases.neo4j.io"
NEO4J_USERNAME = "neo4j"
NEO4J_PASSWORD = "qIjWFLau1zk4wrnIAJOj-6vqB7kugbt6688EmHXpKEQ"

url = "https://data.anfr.fr/api/records/2.0/search/resource_id=88ef0887-6b0f-4d3f-8545-6d64c8f597da&distinct=true"

def create_nodes(tx, records):
    query = "UNWIND $records AS record "
    query += "CREATE (a:antenne) "
    query += "SET a = record.fields "
    tx.run(query, records=records)

response = requests.get(url)
records = response.json()["records"]

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

batch_size = 1000

with driver.session() as session:
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        session.write_transaction(create_nodes, batch)

driver.close()

