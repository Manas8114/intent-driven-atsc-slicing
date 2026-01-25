"""
Generate synthetic SRTM terrain data for demo purposes.
Creates a proper grid covering the demo area around Hyderabad, India.
"""
import shapefile
import os

def generate_terrain_data():
    """Generate synthetic terrain grid for the demo area."""
    
    # Grid parameters - centered around Hyderabad (lat: 17.38, lon: 78.47)
    lat_center, lon_center = 17.38, 78.47
    grid_size = 0.1  # ~11km at equator
    points_per_side = 10

    # Generate grid points with realistic elevation variation
    points = []
    elevations = []

    for i in range(points_per_side):
        for j in range(points_per_side):
            lat = lat_center - grid_size/2 + (i * grid_size / (points_per_side - 1))
            lon = lon_center - grid_size/2 + (j * grid_size / (points_per_side - 1))
            
            # Simulate terrain: higher in center (hills), lower at edges
            dist_from_center = ((i - points_per_side/2)**2 + (j - points_per_side/2)**2)**0.5
            base_elev = 500  # Base elevation in meters (Deccan Plateau)
            elev = base_elev + 50 - dist_from_center * 10 + (i * j % 20)  # Some variation
            
            points.append([lon, lat])
            elevations.append(elev)

    # Create new shapefile
    data_path = os.path.join(os.path.dirname(__file__), 'srtm')
    w = shapefile.Writer(data_path)
    w.field('id', 'N')
    w.field('lat', 'F', decimal=6)
    w.field('elevation', 'F', decimal=2)

    for idx, (point, elev) in enumerate(zip(points, elevations)):
        w.point(point[0], point[1])
        w.record(idx, point[1], elev)

    w.close()

    # Create .prj file (WGS84 projection)
    prj = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
    with open(data_path + '.prj', 'w') as f:
        f.write(prj)

    print(f"[TerrainGen] Created {len(points)} terrain points covering {grid_size}deg x {grid_size}deg area")
    print(f"[TerrainGen] Center: Hyderabad ({lat_center}, {lon_center})")
    print(f"[TerrainGen] Elevation range: {min(elevations):.0f}m - {max(elevations):.0f}m")
    print(f"[TerrainGen] Output: {data_path}.shp")
    
    return len(points)


if __name__ == "__main__":
    generate_terrain_data()
