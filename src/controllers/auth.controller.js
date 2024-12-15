import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.config.js';

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
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 1440);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      requiresMfaSetup,
      requiresMfaValidation,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const token2 = req.cookies.token;
    console.log('====================================');
    console.log(req.cookies.token);
    console.log('====================================');
    // Limpiar la cookie del token
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0)
    });

    // Obtener el ID del usuario desde el token de las cookies
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    // Actualizar el estado de MFA en la base de datos
    await User.findByIdAndUpdate(userId, { mfaValidated: false });

    // Respuesta de éxito
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};