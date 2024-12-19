import Role from '../models/role.model.js';

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions, menus } = req.body;

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'El rol ya existe' });
    }

    const role = new Role({
      name,
      description,
      permissions,
      menus
    });

    const savedRole = await role.save();
    res.status(201).json(savedRole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('menus', 'nombre ruta icono');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('menus', 'nombre ruta icono');
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('menus', 'nombre ruta icono');

    if (!updatedRole) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json(updatedRole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!deletedRole) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const initializeDefaultRoles = async (req, res) => {
  try {
    const defaultPermissions = ['ver', 'crear', 'editar', 'borrar', 'reportes', 'dashboard'];

    const roles = [
      {
        name: 'admin',
        description: 'Administrador del sistema con acceso total',
        permissions: defaultPermissions
      },
      {
        name: 'user',
        description: 'Usuario regular del sistema',
        permissions: ['ver']
      },
      {
        name: 'supervisor',
        description: 'Supervisor con acceso a reportes y dashboard',
        permissions: ['ver', 'reportes', 'dashboard']
      },
      {
        name: 'soporte',
        description: 'Personal de soporte técnico',
        permissions: ['ver', 'crear', 'editar']
      },
      {
        name: 'gerente',
        description: 'Gerente con acceso a reportes y dashboard',
        permissions: ['ver', 'reportes', 'dashboard', 'editar']
      }
    ];

    const results = [];

    for (const role of roles) {
      const existingRole = await Role.findOne({ name: role.name });
      if (!existingRole) {
        const savedRole = await Role.create(role);
        results.push({
          message: `Role ${role.name} created successfully`,
          role: savedRole
        });
      } else {
        results.push({
          message: `Role ${role.name} already exists`,
          role: existingRole
        });
      }
    }

    res.json({
      message: 'Roles initialization completed',
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 