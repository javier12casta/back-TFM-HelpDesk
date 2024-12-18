import Area from '../models/area.model.js';

export const createAreas = async (req, res) => {
  try {
    const areasData = req.body;
    const results = [];

    for (const areaData of areasData) {
      // Verificar si el área ya existe
      const existingArea = await Area.findOne({ area: areaData.area });

      if (existingArea) {
        results.push({ message: `Área '${areaData.area}' ya existe.`, area: existingArea });
      } else {
        const newArea = new Area(areaData);
        const savedArea = await newArea.save();
        results.push({ message: `Área '${savedArea.area}' creada exitosamente.`, area: savedArea });
      }
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllAreas = async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAreaById = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }
    res.json(area);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateArea = async (req, res) => {
  try {
    const updatedArea = await Area.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!updatedArea) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }
    res.json(updatedArea);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteArea = async (req, res) => {
  try {
    const deletedArea = await Area.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedAt: Date.now()
      },
      { new: true }
    );
    if (!deletedArea) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }
    res.json({ message: 'Área eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 