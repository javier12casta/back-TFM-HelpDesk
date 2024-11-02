import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';

export const authMiddleware = (req, res, next) => {
    try {
        // Obtener token de las cookies
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};