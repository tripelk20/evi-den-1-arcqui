const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const uri = 'mongodb+srv://klcgkiang098_db_user:aUyjGRJeEm13bK0a@cluster0.mcndrfj.mongodb.net/conection?retryWrites=true&w=majority';
let db;

// Middleware
app.use(cors()); // Permite peticiones desde localhost (frontend)
app.use(bodyParser.json());

// Conectar a MongoDB
async function connectToDB() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        db = client.db('conection'); // Nombre de la DB
        console.log('Conectado a MongoDB');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error);
    }
}

// Iniciar conexión al cargar el servidor
connectToDB();