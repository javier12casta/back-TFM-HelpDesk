import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { mfaController } from '../controllers/mfa.controller.js';

const userRoutes = Router();

// Rutas públicas
userRoutes.post('/users', userController.createUser);

// Rutas que podrían requerir autenticación
userRoutes.get('/users', userController.getAllUsers);
userRoutes.get('/users/:id', userController.getUserById);
userRoutes.put('/users/:id', userController.updateUser);
userRoutes.delete('/users/:id', userController.deleteUser);

// MFA routes
userRoutes.post('/users/mfa/generate', mfaController.generateMFA);
userRoutes.post('/users/mfa/verify', mfaController.verifyMFA);
userRoutes.post('/users/mfa/validate', mfaController.validateMFAForLogin);

export { userRoutes };
