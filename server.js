// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Route pour servir index.html à la racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint pour récupérer les données des trackers depuis Traccar
app.get('/getTrackers', async (req, res) => {
    try {
        // Récupérer les positions
        const positionsResponse = await axios.get('https://demo2.traccar.org/api/positions', {
            headers: {
                'Authorization': `Basic ${Buffer.from(process.env.TRACCAR_USER + ':' + process.env.TRACCAR_PASSWORD).toString('base64')}`
            }
        });

        // Récupérer les devices
        const devicesResponse = await axios.get('https://demo2.traccar.org/api/devices', {
            headers: {
                'Authorization': `Basic ${Buffer.from(process.env.TRACCAR_USER + ':' + process.env.TRACCAR_PASSWORD).toString('base64')}`
            }
        });

        const positionsData = positionsResponse.data;
        const devicesData = devicesResponse.data;

        // Mapper les positions avec les devices
        const trackers = positionsData.map(position => {
            const device = devicesData.find(d => d.id === position.deviceId);
            return {
                ...position,
                device: device ? { id: device.id, name: device.name } : null
            };
        });

        res.json(trackers);
    } catch (error) {
        console.error('Erreur lors de la récupération des données des trackers:', error);
        res.status(500).send('Erreur lors de la récupération des données');
    }
});

// Endpoint pour les appels à l'API Mapbox (exemple)
app.get('/mapbox/:endpoint', async (req, res) => {
    try {
        const endpoint = req.params.endpoint;
        const mapboxResponse = await axios.get(`https://api.mapbox.com/${endpoint}`, {
            params: {
                access_token: process.env.MAPBOX_TOKEN,
                ...req.query // Transfère les autres paramètres si nécessaire
            }
        });
        res.json(mapboxResponse.data);
    } catch (error) {
        console.error('Erreur lors de la requête à Mapbox:', error);
        res.status(500).send('Erreur lors de la requête à Mapbox');
    }
});

// Endpoint pour sauvegarder les dessins sur le serveur
app.post('/api/drawings', (req, res) => {
    const drawings = req.body;

    // Valider les données reçues (simple validation)
    if (drawings.type !== 'FeatureCollection' || !Array.isArray(drawings.features)) {
        return res.status(400).send('Données invalides');
    }

    // Sauvegarder les dessins dans le fichier drawings.json
    fs.writeFile(path.join(__dirname, 'drawings.json'), JSON.stringify(drawings, null, 2), (err) => {
        if (err) {
            console.error('Erreur lors de la sauvegarde des dessins:', err);
            return res.status(500).send('Erreur lors de la sauvegarde des dessins');
        }
        res.status(200).send('Dessins sauvegardés avec succès');
    });
});

// Endpoint pour charger les dessins depuis le serveur
app.get('/api/drawings', (req, res) => {
    fs.readFile(path.join(__dirname, 'drawings.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Erreur lors du chargement des dessins:', err);
            return res.status(500).send('Erreur lors du chargement des dessins');
        }
        try {
            const drawings = JSON.parse(data);
            res.json(drawings);
        } catch (parseError) {
            console.error('Erreur de parsing JSON:', parseError);
            res.status(500).send('Erreur de parsing des dessins');
        }
    });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
