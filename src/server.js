const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Importamos la conexión

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.send('API está funcionando');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
