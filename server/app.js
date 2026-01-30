const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000; // Puerto del servidor
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

// Inicializar datos por defecto si la colección está vacía
app.get('/init', async (req, res) => {
    try {
        const usersCollection = db.collection('users');
        const count = await usersCollection.countDocuments();
        if (count === 0) {
            const defaultUsers = [
                { username: 'admin', password: await bcrypt.hash('admin', 10) },
                { username: 'user1', password: await bcrypt.hash('user1', 10) },
                { username: 'user2', password: await bcrypt.hash('user2', 10) }
            ];
            await usersCollection.insertMany(defaultUsers);
            res.status(200).send('Datos iniciales insertados');
        } else {
            res.status(200).send('Datos ya existen');
        }
    } catch (error) {
        res.status(500).send('Error inicializando datos');
    }
});