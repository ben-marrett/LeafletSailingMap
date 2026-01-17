-- Sample routes for the Sailing Adventure Map
-- These routes are visible to all users (guests and logged-in)

-- Bay of Islands Loop: Russell to Cape Brett and back
INSERT INTO routes (user_id, name, distance_km, color, geojson, is_sample) VALUES (
    NULL,
    'Bay of Islands Loop',
    42.5,
    '#2E86AB',
    '{
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [174.121, -35.265],
                [174.150, -35.240],
                [174.200, -35.210],
                [174.280, -35.180],
                [174.320, -35.165],
                [174.280, -35.180],
                [174.200, -35.210],
                [174.150, -35.240],
                [174.121, -35.265]
            ]
        }
    }'::jsonb,
    true
);

-- Kaipara Harbour Entry: Approach route from sea
INSERT INTO routes (user_id, name, distance_km, color, geojson, is_sample) VALUES (
    NULL,
    'Kaipara Harbour Entry',
    28.3,
    '#A23B72',
    '{
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [174.000, -36.350],
                [174.050, -36.380],
                [174.080, -36.420],
                [174.100, -36.480],
                [174.100, -36.500]
            ]
        }
    }'::jsonb,
    true
);

-- Russell to Opua Marina
INSERT INTO routes (user_id, name, distance_km, color, geojson, is_sample) VALUES (
    NULL,
    'Russell to Opua',
    8.2,
    '#F18F01',
    '{
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [174.121, -35.265],
                [174.105, -35.275],
                [174.095, -35.290],
                [174.100, -35.310],
                [174.120, -35.312]
            ]
        }
    }'::jsonb,
    true
);
