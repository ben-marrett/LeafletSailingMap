const express = require('express');
const pool = require('./db');
const router = express.Router();

// Weather API proxy
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

router.get('/weather', async (req, res) => {
    if (!OPENWEATHERMAP_API_KEY) {
        return res.status(500).json({ error: 'Weather API not configured' });
    }

    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'lat and lon required' });
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Weather API error:', err);
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// GET /api/routes - Get routes (sample routes for guests, user routes + samples for logged in)
router.get('/routes', async (req, res) => {
    try {
        let routes = [];

        // Always include sample routes
        const sampleResult = await pool.query(
            'SELECT id, name, distance_km, color, geojson, is_sample FROM routes WHERE is_sample = true'
        );
        routes = routes.concat(sampleResult.rows);

        // If logged in, also get user's routes
        if (req.session.userId) {
            const userResult = await pool.query(
                'SELECT id, name, distance_km, color, geojson, is_sample FROM routes WHERE user_id = $1 AND is_sample = false',
                [req.session.userId]
            );
            routes = routes.concat(userResult.rows);
        }

        res.json({ routes });
    } catch (err) {
        console.error('Error loading routes:', err);
        res.status(500).json({ error: 'Failed to load routes' });
    }
});

// POST /api/routes - Save a route (logged in users only)
router.post('/routes', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Login required to save routes' });
    }

    const { name, distance, color, geojson } = req.body;

    if (!name || !geojson) {
        return res.status(400).json({ error: 'Name and geojson are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO routes (user_id, name, distance_km, color, geojson) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [req.session.userId, name, distance || 0, color || '#3388ff', geojson]
        );
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        console.error('Error saving route:', err);
        res.status(500).json({ error: 'Failed to save route' });
    }
});

// DELETE /api/routes/:id - Delete a route (logged in users only, own routes only)
router.delete('/routes/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Login required' });
    }

    const routeId = req.params.id;

    try {
        const result = await pool.query(
            'DELETE FROM routes WHERE id = $1 AND user_id = $2 AND is_sample = false RETURNING id',
            [routeId, req.session.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Route not found or not authorized' });
        }

        res.json({ message: 'Route deleted' });
    } catch (err) {
        console.error('Error deleting route:', err);
        res.status(500).json({ error: 'Failed to delete route' });
    }
});

module.exports = router;
