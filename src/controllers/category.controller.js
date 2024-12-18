import Category from '../models/category.model.js';

export const createCategories = async (req, res) => {
  try {
    const categoriesData = req.body;
    const results = [];

    for (const categoryData of categoriesData) {
      // Verificar si la categoría ya existe
      const existingCategory = await Category.findOne({ nombre_categoria: categoryData.nombre_categoria });

      if (existingCategory) {
        // Si existe, puedes optar por actualizarla o simplemente omitirla
        results.push({ message: `Categoría '${categoryData.nombre_categoria}' ya existe.`, category: existingCategory });
      } else {
        // Crear nueva categoría
        const newCategory = new Category(categoryData);
        const savedCategory = await newCategory.save();
        results.push({ message: `Categoría '${savedCategory.nombre_categoria}' creada exitosamente.`, category: savedCategory });
      }
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    // Soft delete - solo marcamos como inactiva
    const deletedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 