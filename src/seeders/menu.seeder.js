import Menu from '../models/menu.model.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.config.js';

const menus = [
  {
    name: 'Inicio',
    path: '/app',
    icon: 'home',
    order: 1
  },
  {
    name: 'Tickets',
    path: '/app/tickets',
    icon: 'confirmation_number',
    order: 2
  },
  {
    name: 'Roles',
    path: '/app/roles',
    icon: 'groups',
    order: 3
  },
  {
    name: 'Usuarios',
    path: '/app/users',
    icon: 'groups',
    order: 4
  },
  {
    name: 'Menus',
    path: '/app/menus',
    icon: 'menu',
    order: 5
  },
  {
    name: 'Reportes',
    path: '/app/reports',
    icon: 'bar_chart',
    order: 6
  },
  {
    name: 'Dashboard',
    path: '/app/dashboard',
    icon: 'dashboard',
    order: 7
  }
];

const seedMenus = async () => {
  try {
    await connectDB();

    // Eliminar la colección completamente para eliminar índices antiguos
    try {
      await mongoose.connection.collections.menus.drop();
      console.log('Colección de menús eliminada completamente');
    } catch (error) {
      console.log('La colección de menús no existía');
    }

    // Crear nuevos índices basados en el esquema actual
    await Menu.createCollection();
    console.log('Nueva colección de menús creada');

    // Insertar nuevos menús
    const createdMenus = await Menu.insertMany(menus);
    console.log('Menús insertados exitosamente:', createdMenus);

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión a la base de datos cerrada');

  } catch (error) {
    console.error('Error al sembrar menús:', error);
    if (error.code === 11000) {
      console.error('Error de duplicación. Detalles:', error.keyPattern);
    }
    process.exit(1);
  }
};

// Ejecutar el seeder
seedMenus(); 