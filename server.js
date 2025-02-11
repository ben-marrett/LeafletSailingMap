// filepath: /Users/benmarrett/Work/Leaflet/server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});