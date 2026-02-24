const prisma = require('../prisma/client');

const MENU_SECTIONS = {
  ZUPA:              { label: 'Zupa', maxSelections: 1 },
  DANIE_GLOWNE:      { label: 'Danie główne', maxSelections: null },
  DODATKI_GLOWNE:    { label: 'Dodatki do dania głównego', maxSelections: 2 },
  SUROWKI:           { label: 'Surówki do obiadu', maxSelections: 3 },
  DESER:             { label: 'Deser', maxSelections: 1 },
  CIEPLA_1:          { label: '1. ciepłe danie', maxSelections: 1 },
  DODATKI_CIEPLA_1:  { label: 'Dodatek do 1. ciepłego', maxSelections: 1 },
  SUROWKA_CIEPLA_1:  { label: 'Surówka do 1. ciepłego', maxSelections: 1 },
  CIEPLA_2:          { label: '2. ciepłe danie', maxSelections: 1 },
  DODATKI_CIEPLA_2:  { label: 'Dodatek do 2. ciepłego', maxSelections: 1 },
  SUROWKA_CIEPLA_2:  { label: 'Surówka do 2. ciepłego', maxSelections: 1 },
  CIEPLA_3:          { label: '3. ciepłe danie', maxSelections: 1 },
  DODATKI_CIEPLA_3:  { label: 'Dodatek do 3. ciepłego', maxSelections: 1 },
  SUROWKA_CIEPLA_3:  { label: 'Surówka do 3. ciepłego', maxSelections: 1 },
  ZIMNA_PLYTA:       { label: 'Zimna płyta', maxSelections: 3 },
  SALATKI:           { label: 'Sałatki', maxSelections: 2 },
};

exports.getDishes = async (req, res, next) => {
  try {
    const dishes = await prisma.menuDish.findMany({
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    });
    const grouped = {};
    for (const [key, cfg] of Object.entries(MENU_SECTIONS)) {
      grouped[key] = { ...cfg, dishes: dishes.filter(d => d.section === key) };
    }
    res.json(grouped);
  } catch (err) { next(err); }
};

exports.addDish = async (req, res, next) => {
  try {
    const { section, name, description } = req.body;
    if (!MENU_SECTIONS[section]) return res.status(400).json({ error: 'Nieprawidłowa sekcja' });
    const dish = await prisma.menuDish.create({ data: { section, name, description } });
    res.status(201).json(dish);
  } catch (err) { next(err); }
};

exports.deleteDish = async (req, res, next) => {
  try {
    await prisma.menuDish.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.getWeddingMenu = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
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
    const dishesBySection = {};
    for (const key of Object.keys(MENU_SECTIONS)) {
      dishesBySection[key] = allDishes.filter(d => d.section === key);
    }
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

exports.updateConfig = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const {
      mainCourseMode, dessertChoice, locked,
      cakeSource, cakeFlavors,
      sweetTableChoice, sweetTableAmount,
      guestPackageChoice, guestPackagePrice,
    } = req.body;

    const data = {
      ...(mainCourseMode !== undefined && { mainCourseMode }),
      ...(dessertChoice !== undefined && { dessertChoice }),
      ...(locked !== undefined && { locked }),
      ...(cakeSource !== undefined && { cakeSource }),
      ...(cakeFlavors !== undefined && { cakeFlavors }),
      ...(sweetTableChoice !== undefined && { sweetTableChoice }),
      ...(sweetTableAmount !== undefined && { sweetTableAmount: sweetTableAmount ? parseFloat(sweetTableAmount) : null }),
      ...(guestPackageChoice !== undefined && { guestPackageChoice }),
      ...(guestPackagePrice !== undefined && { guestPackagePrice: guestPackagePrice ? parseFloat(guestPackagePrice) : null }),
    };

    const config = await prisma.weddingMenuConfig.upsert({
      where: { weddingId },
      create: { weddingId, ...data },
      update: data,
    });

    if (mainCourseMode !== undefined) {
      await prisma.weddingMenuSelection.deleteMany({
        where: { weddingId, section: 'DANIE_GLOWNE' },
      });
    }
    res.json(config);
  } catch (err) { next(err); }
};

exports.selectDish = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { section, dishId, slotIndex = 0 } = req.body;
    const config = await prisma.weddingMenuConfig.findUnique({ where: { weddingId } });
    if (config?.locked && req.user.role === 'couple') {
      return res.status(403).json({ error: 'Menu jest zablokowane' });
    }
    if (!MENU_SECTIONS[section]) return res.status(400).json({ error: 'Nieprawidłowa sekcja' });
    if (!dishId) {
      await prisma.weddingMenuSelection.deleteMany({ where: { weddingId, section, slotIndex } });
      return res.json({ action: 'removed' });
    }
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

exports.uploadCakeImage = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    const { uploadFile } = require('../utils/supabaseStorage');
    const path = await uploadFile(req.file.buffer, 'documents', req.file.originalname, req.file.mimetype);
    await prisma.weddingMenuConfig.upsert({
      where: { weddingId },
      create: { weddingId, cakeImagePath: path },
      update: { cakeImagePath: path },
    });
    res.json({ path });
  } catch (err) { next(err); }
};

exports.getCakeImageUrl = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const config = await prisma.weddingMenuConfig.findUnique({ where: { weddingId } });
    if (!config?.cakeImagePath) return res.json({ url: null });
    const { getSignedUrl } = require('../utils/supabaseStorage');
    const url = await getSignedUrl('documents', config.cakeImagePath, 3600);
    res.json({ url });
  } catch (err) { next(err); }
};
