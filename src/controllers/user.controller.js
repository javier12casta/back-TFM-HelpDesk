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
      const users = await User.find({})
        .populate('role', 'name')
        .populate('area', 'area')
        .select('-password');
      
      // Obtener los nombres de los roles y áreas para cada usuario
      const usersWithDetails = users.map(user => {
        const userObj = user.toObject();
        return {
          ...userObj,
          roleName: user.role?.name || null,
          areaName: user.area?.area || null
        };
      });

      res.status(200).json({
        success: true,
        data: usersWithDetails
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
      const user = await User.findById(req.params.id)
        .populate('role', 'name')
        .populate('area', 'area')
        .select('-password');

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
  },

  // Obtener usuarios con nombre de área
  getUsers: async (req, res) => {
    try {
      const users = await User.find()
        .populate('role', 'name')
        .populate('area', 'area')
        .select('-password');

      // Transformar los datos para incluir el nombre del área
      const usersWithAreaName = users.map(user => {
        const userObject = user.toObject();
        return {
          ...userObject,
          areaName: user.area?.area || null,
          roleName: user.role?.name || null
        };
      });

      res.json(usersWithAreaName);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Obtener perfil del usuario
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id)
        .populate('role', 'name')
        .populate('area', 'area')
        .select('-password');

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Transformar los datos para incluir el nombre del área
      const userWithAreaName = {
        ...user.toObject(),
        areaName: user.area?.area || null,
        roleName: user.role?.name || null
      };

      res.json(userWithAreaName);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};
