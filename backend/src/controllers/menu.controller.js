const prisma = require('../prisma/client');

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      include: { items: { where: { isAvailable: true }, orderBy: { name: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, order } = req.body;
    const cat = await prisma.menuCategory.create({ data: { name, order: order || 0 } });
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const { name, description, categoryId, pricePerPerson } = req.body;
    const item = await prisma.menuItem.create({ data: { name, description, categoryId, pricePerPerson } });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { name, description, pricePerPerson, isAvailable } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { name, description, pricePerPerson, isAvailable },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.removeItem = async (req, res, next) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.getSelections = async (req, res, next) => {
  try {
    const wedding = await prisma.wedding.findUnique({ where: { id: req.params.weddingId } });
    if (!wedding) return res.status(404).json({ error: 'Nie znaleziono wesela' });

    const selections = await prisma.weddingMenuItem.findMany({
      where: { weddingId: req.params.weddingId },
      include: { menuItem: { include: { category: true } } },
    });

    const totalCost = selections.reduce((sum, s) => sum + Number(s.menuItem.pricePerPerson) * wedding.guestCount, 0);
    res.json({ selections, totalCost, guestCount: wedding.guestCount });
  } catch (err) {
    next(err);
  }
};

exports.toggleSelection = async (req, res, next) => {
  try {
    const { menuItemId, notes } = req.body;
    const existing = await prisma.weddingMenuItem.findUnique({
      where: { weddingId_menuItemId: { weddingId: req.params.weddingId, menuItemId } },
    });

    if (existing) {
      if (existing.locked) return res.status(400).json({ error: 'Menu jest zablokowane' });
      await prisma.weddingMenuItem.delete({ where: { id: existing.id } });
      return res.json({ action: 'removed' });
    }

    const selection = await prisma.weddingMenuItem.create({
      data: { weddingId: req.params.weddingId, menuItemId, notes },
    });
    res.status(201).json({ action: 'added', selection });
  } catch (err) {
    next(err);
  }
};

exports.lockSelections = async (req, res, next) => {
  try {
    const { locked } = req.body;
    await prisma.weddingMenuItem.updateMany({
      where: { weddingId: req.params.weddingId },
      data: { locked: locked !== false },
    });
    res.json({ message: locked !== false ? 'Menu zablokowane' : 'Menu odblokowane' });
  } catch (err) {
    next(err);
  }
};
