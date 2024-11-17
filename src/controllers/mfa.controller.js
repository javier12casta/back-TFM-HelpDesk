import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/user.model.js';

export const mfaController = {
  generateMFA: async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId es requerido'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Generar secreto
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `BankTicket:${user.email}`,
        issuer: 'BankTicket',
        otpauth_url: true,
      });
      
      // Generar QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      // Guardar secreto temporalmente
      user.mfaSecret = secret.base32;
      user.mfaEnabled = user.mfaEnabled ? user.mfaEnabled : false; // No habilitado hasta que se verifique
      await user.save();

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          otpauthUrl: secret.otpauth_url,
          qrCodeUrl: qrCodeUrl
        },
        message: 'MFA generado exitosamente'
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
      
      if (!userId || !token) {
        return res.status(400).json({
          success: false,
          message: 'userId y token son requeridos'
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.mfaSecret) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado o MFA no configurado'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 1
      });

      if (verified) {
        user.mfaEnabled = true;
        user.mfaSetup = true;
        user.mfaValidated = true;
        await user.save();
      }

      res.json({
        success: true,
        data: { verified },
        message: verified ? 'MFA verificado correctamente' : 'Código inválido'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  validateMFAForLogin: async (req, res) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        return res.status(400).json({
          success: false,
          message: 'userId y token son requeridos'
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado o MFA no habilitado'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 1
      });

      res.json({
        success: true,
        data: { verified },
        message: verified ? 'Login MFA válido' : 'Código MFA inválido'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}; 