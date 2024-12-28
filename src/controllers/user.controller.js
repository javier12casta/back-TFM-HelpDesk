import User from '../models/user.model.js';
import Role from '../models/role.model.js';

export const userController = {
  // Crear usuario
  createUser: async (req, res) => {
    try {
      const newUser = new User(req.body);
      const savedUser = await newUser.save();
      const userResponse = savedUser.toObject();
      delete userResponse.password;
      
      // Obtener el nombre del rol
      const role = await Role.findById(savedUser.role);
      userResponse.roleName = role ? role.name : null;
      
      res.status(201).json({
        success: true,
        data: userResponse,
        message: 'Usuario creado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Obtener todos los usuarios
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({}).select('-password');
      
      // Obtener los nombres de los roles para cada usuario
      const usersWithRoleNames = await Promise.all(users.map(async (user) => {
        const userObj = user.toObject();
        const role = await Role.findById(user.role);
        userObj.roleName = role ? role.name : null;
        return userObj;
      }));

      res.status(200).json({
        success: true,
        data: usersWithRoleNames
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Obtener usuario por ID
  getUserById: async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const userObj = user.toObject();
      const role = await Role.findById(user.role);
      userObj.roleName = role ? role.name : null;

      res.status(200).json({
        success: true,
        data: userObj
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Actualizar usuario
  updateUser: async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const userObj = updatedUser.toObject();
      const role = await Role.findById(updatedUser.role);
      userObj.roleName = role ? role.name : null;

      res.status(200).json({
        success: true,
        data: userObj,
        message: 'Usuario actualizado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Eliminar usuario
  deleteUser: async (req, res) => {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      
      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};
