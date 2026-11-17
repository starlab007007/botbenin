"""Export a bounded WAOUH directory from the licensed Geofabrik Benin extract."""
import argparse
import json
from pathlib import Path

import osmium


SERVICES = {
    "car_repair": "Réparation automobile",
    "bicycle": "Cycles et pièces",
    "computer": "Informatique",
    "electronics": "Électronique",
    "hardware": "Quincaillerie",
    "car_parts": "Pièces automobiles",
    "tailor": "Couture",
    "shoemaker": "Cordonnerie",
    "carpenter": "Menuiserie",
    "plumber": "Plomberie",
    "electrician": "Électricité",
}
CITIES = {
    "cotonou": "Cotonou",
    "porto-novo": "Porto-Novo",
    "parakou": "Parakou",
    "abomey-calavi": "Abomey-Calavi",
    "bohicon": "Bohicon",
    "natitingou": "Natitingou",
    "lokossa": "Lokossa",
    "ouidah": "Ouidah",
    "djougou": "Djougou",
}


def export(pbf: Path, output: Path) -> None:
    reader = osmium.io.Reader(str(pbf))
    timestamp = reader.header().get("osmosis_replication_timestamp")
    reader.close()
    centres = {}
    for node in osmium.FileProcessor(str(pbf), osmium.osm.NODE):
        name = node.tags.get("name", "").lower().strip().replace(" ", "-")
        if name in CITIES and node.tags.get("place") in {"city", "town"} and node.location.valid():
            centres[CITIES[name]] = (node.location.lon, node.location.lat)
    groups = {}
    for item in osmium.FileProcessor(str(pbf), osmium.osm.NODE | osmium.osm.WAY):
        tags = item.tags
        category = SERVICES.get(tags.get("craft")) or SERVICES.get(tags.get("shop"))
        name = tags.get("name", "").strip()
        city = CITIES.get(tags.get("addr:city", "").lower().strip().replace(" ", "-"))
        if not category or len(name) < 5:
            continue
        if not city and item.is_node() and item.location.valid():
            origin = (item.location.lon, item.location.lat)
            distances = [((origin[0]-lon)**2 + (origin[1]-lat)**2, label)
                         for label, (lon, lat) in centres.items()]
            if distances:
                distance, label = min(distances)
                if distance < 0.033**2:
                    city = label + " (zone)"
        if not city:
            continue
        url = f"https://www.openstreetmap.org/{'node' if item.is_node() else 'way'}/{item.id}"
        key = (city, category)
        if key in groups:
            continue
        groups[key] = {"kind": "provider", "intent": "ANNOUNCE", "title": name, "category": category,
                       "city": city, "url": url, "license": "ODbL-1.0"}
    selected = sorted(groups.values(), key=lambda row: (row["city"], row["category"], row["url"]))
    # Two records per city before filling remaining slots with distinct categories.
    localities = {}
    for row in selected:
        name = row["city"].removesuffix(" (zone)")
        localities.setdefault(name, []).append(row)
    cities = sorted(localities)
    ordered = []
    for index in range(15):
        for city in cities:
            local = localities[city]
            if index < len(local):
                ordered.append(local[index])
    payload = {"dataset":"Annuaire ouvert du Bénin", "attribution":"© OpenStreetMap contributors",
               "license":"ODbL-1.0", "license_url":"https://www.openstreetmap.org/copyright",
               "source":"https://download.geofabrik.de/africa/benin.html",
               "source_timestamp":timestamp or None, "items":ordered[:15]}
    if not payload["items"]:
        raise ValueError("No named businesses with a declared locality found")
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    export(args.pbf, args.output)
