import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.config.js';
import Role from '../models/role.model.js';
import speakeasy from 'speakeasy';

dotenv.config();

export const register = async (req, res) => {
  const { name, email, password, mfaEnabled } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      mfaEnabled: mfaEnabled || false,
      mfaSetup: false,
      mfaValidated: false
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;        
        res.json({
          token,
          requiresMfaSetup: (user.mfaEnabled && user.mfaSetup),
          requiresMfaValidation: user.mfaEnabled && user.mfaSetup && !user.mfaValidated
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    const userInfo = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const requiresMfaSetup = (user.mfaEnabled && user.mfaSetup);
    const requiresMfaValidation = (user.mfaEnabled && user.mfaSetup && user.mfaValidated);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.cookie('user', userInfo.toObject(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    const role = await Role.findById(user.role);
    const roleName = role ? role.name : null;

    res.json({
      message: 'Login successful',
      requiresMfaSetup,
      requiresMfaValidation,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        roleName: roleName,
        area: user.area || null,
        areaName: user.area?.area || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req, res) => {
  try {
    // Obtener el token de las cookies
    const token = req.cookies.token;
    
    if (token) {
      try {
        // Decodificar el token para obtener el ID del usuario
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Actualizar el estado de MFA del usuario
        await User.findByIdAndUpdate(decoded.id, {
          mfaValidated: false
        });
      } catch (tokenError) {
        console.error('Error al decodificar token durante logout:', tokenError);
      }
    }

    // Limpiar la cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error durante logout:', error);
    res.status(500).json({ message: error.message });
  }
};

export const authController = {
    setupMFA: async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Generar secreto MFA si no existe
            const secret = speakeasy.generateSecret({
                length: 20,
                name: `HelpDesk:${user.email}`
            });

            // Guardar el secreto en el usuario
            user.mfaSecret = secret.base32;
            user.mfaSetup = true;
            await user.save();

            res.json({
                success: true,
                data: {
                    secret: secret.base32,
                    otpauth_url: secret.otpauth_url
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    verifyMFA: async (req, res) => {
        try {
            const { userId, token } = req.body;
            const user = await User.findById(userId);

            if (!user || !user.mfaSecret || !user.mfaSetup) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado o MFA no configurado'
                });
            }

            // Verificar el token
            const verified = speakeasy.totp.verify({
                secret: user.mfaSecret,
                encoding: 'base32',
                token: token,
                window: 1 // Permitir 1 intervalo de tiempo antes/después
            });

            if (verified) {
                user.mfaEnabled = true;
                await user.save();

                res.json({
                    success: true,
                    message: 'MFA verificado y habilitado correctamente'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Código de verificación inválido'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    validateMFA: async (req, res) => {
        try {
            const { userId, token } = req.body;
            const user = await User.findById(userId);

            if (!user || !user.mfaEnabled) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado o MFA no habilitado'
                });
            }

            const validated = speakeasy.totp.verify({
                secret: user.mfaSecret,
                encoding: 'base32',
                token: token,
                window: 1
            });

            if (validated) {
                res.json({
                    success: true,
                    message: 'Código MFA válido'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Código MFA inválido'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};