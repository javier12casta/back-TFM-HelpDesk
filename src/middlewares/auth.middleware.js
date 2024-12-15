import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';

export const authMiddleware = (req, res, next) => {
    try {
        console.log('Cookies recibidas:', req.cookies); // Depura todas las cookies
        const token = req.cookies.token;

        if (!token) {
            console.log('No hay token en las cookies');
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error al verificar el token:', error.message);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};