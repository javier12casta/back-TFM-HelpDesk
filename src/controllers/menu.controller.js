import Menu from '../models/menu.model.js';

export const createMenu = async (req, res) => {
  try {
    const { nombre, ruta, icono, orden } = req.body;

    const existingMenu = await Menu.findOne({ $or: [{ nombre }, { ruta }] });
    if (existingMenu) {
      return res.status(400).json({ 
        message: 'Ya existe un menú con ese nombre o ruta' 
      });
    }

    const menu = new Menu({
      nombre,
      ruta,
      icono,
      orden
    });

    const savedMenu = await menu.save();
    res.status(201).json(savedMenu);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllMenus = async (req, res) => {
  try {
    const menus = await Menu.find().sort('orden');
    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMenuById = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ message: 'Menú no encontrado' });
    }
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMenu = async (req, res) => {
  try {
    const updatedMenu = await Menu.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!updatedMenu) {
      return res.status(404).json({ message: 'Menú no encontrado' });
    }
    res.json(updatedMenu);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMenu = async (req, res) => {
  try {
    const deletedMenu = await Menu.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!deletedMenu) {
      return res.status(404).json({ message: 'Menú no encontrado' });
    }
    res.json({ message: 'Menú eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 