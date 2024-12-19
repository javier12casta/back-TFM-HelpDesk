import mongoose from 'mongoose';
import Role from '../models/role.model.js';
import { connectDB } from '../config/db.config.js';
import dotenv from 'dotenv';

dotenv.config();

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

const initRoles = async () => {
  try {
    await connectDB();

    for (const role of roles) {
      const existingRole = await Role.findOne({ name: role.name });
      if (!existingRole) {
        await Role.create(role);
        console.log(`Role ${role.name} created successfully`);
      } else {
        console.log(`Role ${role.name} already exists`);
      }
    }

    console.log('Roles initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing roles:', error);
    process.exit(1);
  }
};

initRoles(); 