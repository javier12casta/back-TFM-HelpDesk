import express from 'express';
import { login, logout } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/logout', authMiddleware, logout);

// Ruta protegida de ejemplo
router.get('/protected', authMiddleware, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

export default router;
 