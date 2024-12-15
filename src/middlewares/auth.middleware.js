import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.config.js';

export const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }
        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token is not valid' });
    }
};