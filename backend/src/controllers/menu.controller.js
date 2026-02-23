const prisma = require('../prisma/client');

// Sekcje menu z konfiguracją
const MENU_SECTIONS = {
  ZUPA:        { label: 'Zupa', maxSelections: 1 },
  DANIE_GLOWNE:{ label: 'Danie główne', maxSelections: null }, // zależy od trybu
  SUROWKI:     { label: 'Surówki do obiadu', maxSelections: 3 },
  DESER:       { label: 'Deser', maxSelections: 1 },
  CIEPLA_1:    { label: '1. ciepłe danie', maxSelections: 1 },
  CIEPLA_2:    { label: '2. ciepłe danie', maxSelections: 1 },
  CIEPLA_3:    { label: '3. ciepłe danie', maxSelections: 1 },
  ZIMNA_PLYTA: { label: 'Zimna płyta', maxSelections: 3 },
  SALATKI:     { label: 'Sałatki', maxSelections: 2 },
};

// GET /menu/dishes - wszystkie dania (admin/coordinator)
exports.getDishes = async (req, res, next) => {
  try {
    const dishes = await prisma.menuDish.findMany({
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });
    // Pogrupuj po sekcji
    const grouped = {};
    for (const [key, cfg] of Object.entries(MENU_SECTIONS)) {
      grouped[key] = { ...cfg, dishes: dishes.filter(d => d.section === key) };
    }
    res.json(grouped);
  } catch (err) { next(err); }
};

// POST /menu/dishes - dodaj danie (admin)
exports.addDish = async (req, res, next) => {
  try {
    const { section, name, description } = req.body;
    if (!MENU_SECTIONS[section]) return res.status(400).json({ error: 'Nieprawidłowa sekcja' });
    const dish = await prisma.menuDish.create({ data: { section, name, description } });
    res.status(201).json(dish);
  } catch (err) { next(err); }
};

// DELETE /menu/dishes/:id - usuń danie (admin)
exports.deleteDish = async (req, res, next) => {
  try {
    await prisma.menuDish.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

// GET /menu/wedding/:weddingId - pobierz wybory wesela
exports.getWeddingMenu = async (req, res, next) => {
  try {
    const { weddingId } = req.params;

    // Access control dla pary
    if (req.user.role === 'couple') {
      const wedding = await prisma.wedding.findUnique({ where: { coupleId: req.user.id } });
      if (!wedding || wedding.id !== weddingId) return res.status(403).json({ error: 'Brak dostępu' });
    }

    const [config, selections, allDishes] = await Promise.all([
      prisma.weddingMenuConfig.findUnique({ where: { weddingId } }),
      prisma.weddingMenuSelection.findMany({
        where: { weddingId },
        include: { dish: true },
        orderBy: { slotIndex: 'asc' },
      }),
      prisma.menuDish.findMany({ where: { isAvailable: true }, orderBy: { name: 'asc' } }),
    ]);

    // Pogrupuj dostępne dania po sekcji
    const dishesBySection = {};
    for (const key of Object.keys(MENU_SECTIONS)) {
      dishesBySection[key] = allDishes.filter(d => d.section === key);
    }

    // Pogrupuj wybory po sekcji
    const selectionsBySection = {};
    for (const sel of selections) {
      if (!selectionsBySection[sel.section]) selectionsBySection[sel.section] = [];
      selectionsBySection[sel.section].push(sel);
    }

    res.json({
      config: config || { mainCourseMode: null, dessertChoice: null, locked: false },
      sections: MENU_SECTIONS,
      dishesBySection,
      selectionsBySection,
    });
  } catch (err) { next(err); }
};

// PATCH /menu/wedding/:weddingId/config - ustaw tryb (mainCourseMode, dessertChoice)
exports.updateConfig = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { mainCourseMode, dessertChoice, locked } = req.body;

    const config = await prisma.weddingMenuConfig.upsert({
      where: { weddingId },
      create: { weddingId, mainCourseMode, dessertChoice, locked: locked ?? false },
      update: { 
        ...(mainCourseMode !== undefined && { mainCourseMode }),
        ...(dessertChoice !== undefined && { dessertChoice }),
        ...(locked !== undefined && { locked }),
      },
    });

    // Jeśli zmieniono tryb dania głównego - wyczyść poprzednie wybory dania głównego
    if (mainCourseMode !== undefined) {
      await prisma.weddingMenuSelection.deleteMany({
        where: { weddingId, section: 'DANIE_GLOWNE' },
      });
    }

    res.json(config);
  } catch (err) { next(err); }
};

// POST /menu/wedding/:weddingId/select - wybierz danie
exports.selectDish = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { section, dishId, slotIndex = 0 } = req.body;

    // Sprawdź config (locked)
    const config = await prisma.weddingMenuConfig.findUnique({ where: { weddingId } });
    if (config?.locked && req.user.role === 'couple') {
      return res.status(403).json({ error: 'Menu jest zablokowane' });
    }

    if (!MENU_SECTIONS[section]) return res.status(400).json({ error: 'Nieprawidłowa sekcja' });

    if (dishId === null || dishId === '') {
      // Usuń wybór
      await prisma.weddingMenuSelection.deleteMany({
        where: { weddingId, section, slotIndex },
      });
      return res.json({ action: 'removed' });
    }

    // Sprawdź czy danie istnieje i należy do sekcji
    const dish = await prisma.menuDish.findUnique({ where: { id: dishId } });
    if (!dish || dish.section !== section) return res.status(400).json({ error: 'Nieprawidłowe danie' });

    const selection = await prisma.weddingMenuSelection.upsert({
      where: { weddingId_section_slotIndex: { weddingId, section, slotIndex } },
      create: { weddingId, section, dishId, slotIndex },
      update: { dishId },
      include: { dish: true },
    });

    res.json({ action: 'selected', selection });
  } catch (err) { next(err); }
};
