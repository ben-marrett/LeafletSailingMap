// filepath: /Users/benmarrett/Work/Leaflet/routes.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
    user: 'your-username',
    host: 'localhost',
    database: 'your-database',
    password: 'your-password',
    port: 5432,
});

router.post('/saveRoutes', async (req, res) => {
    const client = await pool.connect();
    try {
        const { routes } = req.body;
        const result = await client.query('INSERT INTO routes(data) VALUES($1) RETURNING id', [routes]);
        res.status(200).send({ id: result.rows[0].id });
    } catch (err) {
        res.status(500).send(err);
    } finally {
        client.release();
    }
});

router.get('/loadRoutes', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT data FROM routes');
        res.status(200).send(result.rows.map(row => row.data));
    } catch (err) {
        res.status(500).send(err);
    } finally {
        client.release();
    }
});

module.exports = router;