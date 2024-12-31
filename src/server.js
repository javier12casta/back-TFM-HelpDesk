import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.config.js';
import authRoutes from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import { categoryRoutes } from './routes/category.routes.js';
import { areaRoutes } from './routes/area.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config.js';
import http from 'http';
import { Server } from 'socket.io';
import { notificationRoutes } from './routes/notification.routes.js';
import { getUserStoredNotifications, markNotificationAsRead } from './controllers/notification.controller.js';
import { roleRoutes } from './routes/role.routes.js';
import { menuRoutes } from './routes/menu.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

dotenv.config();

const app = express();

// Configuración de CORS más específica
const corsOptions = {
    origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:4300', 'http://localhost:3000']
        : process.env.CLIENT_URL,
    credentials: true,  // Importante para cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
app.use('/api', areaRoutes);
app.use('/api', reportRoutes);
app.use('/api', notificationRoutes);
app.use('/api', roleRoutes);
app.use('/api', menuRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de HelpDesk' });
});

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configurar ruta estática para archivos subidos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:4300', 'http://localhost:3000']
      : process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ]
  },
  allowEIO3: true
});

// Configurar eventos de Socket.IO
io.on('connection', async (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('joinRoom', async (userId) => {
        socket.join(userId);
        console.log(`Usuario ${userId} unido a su sala personal`);

        try {
            // Obtener y enviar notificaciones almacenadas al usuario
            const storedNotifications = await getUserStoredNotifications(userId);
            socket.emit('stored-notifications', storedNotifications);
        } catch (error) {
            console.error('Error al enviar notificaciones almacenadas:', error);
        }
    });

    // Nuevo evento para marcar notificaciones como leídas
    socket.on('markNotificationAsRead', async (data) => {
        try {
            const { notificationId, userId } = data;
            const notification = await markNotificationAsRead(notificationId, userId);
            
            if (notification) {
                // Emitir confirmación al usuario
                io.to(userId).emit('notificationMarkedAsRead', {
                    notificationId,
                    message: 'Notificación marcada como leída'
                });
            }
        } catch (error) {
            console.error('Error al marcar notificación como leída:', error);
            socket.emit('notificationError', {
                message: 'Error al marcar la notificación como leída'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

// Usar PORT para ambos servicios (HTTP y WebSocket)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor HTTP y WebSocket corriendo en puerto ${PORT}`);
});