import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';

export const authMiddleware = (req, res, next) => {
    try {
        // Acceder específicamente a la cookie 'token'
        const token = req.cookies.token;

        if (!token) {
            // También verificar el header de Authorization como respaldo
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ 
                    message: 'No token provided in cookies or headers' 
                });
            }
            // Si hay header de autorización, extraer el token
            const bearerToken = authHeader.split(' ')[1];
            if (!bearerToken) {
                return res.status(401).json({ 
                    message: 'Invalid authorization header format' 
                });
            }
            // Verificar el token del header
            const decoded = jwt.verify(bearerToken, JWT_SECRET);
            req.user = decoded;
            return next();
        }

        // Verificar el token de la cookie
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(401).json({ 
            message: 'Token is not valid',
            error: error.message 
        });
    }
};