import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.config.js';
import authRoutes from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de HelpDesk' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});