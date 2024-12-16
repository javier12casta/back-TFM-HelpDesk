import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.config.js';
import authRoutes from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';

dotenv.config();

const app = express();

// Configuración de CORS más específica
const corsOptions = {
    origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:4300', 'http://localhost:3000']
        : process.env.CLIENT_URL,
    credentials: true,  // Importante para cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    maxAge: 600
};

app.use(cors(corsOptions));

// Configuración de cookies
app.use(cookieParser());
app.use(express.json());

// Middleware para configurar headers de seguridad
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    next();
});

// Conectar a MongoDB
connectDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', ticketRoutes);
app.use('/api', categoryRoutes);
app.use('/api', reportRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de HelpDesk' });
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});