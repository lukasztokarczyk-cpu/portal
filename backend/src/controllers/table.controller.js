const prisma = require('../prisma/client');
const { uploadFile, getSignedUrl, deleteFile } = require('../utils/supabaseStorage');

exports.getByWedding = async (req, res, next) => {
  try {
    const tables = await prisma.tableLayout.findMany({
      where: { weddingId: req.params.weddingId },
      include: { guests: { select: { id: true, firstName: true, lastName: true, isChild: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(tables);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, shape, capacity, posX, posY, specialType } = req.body;
    const maxCap = shape === 'round' ? 12 : 24;
    const minCap = shape === 'round' ? 1 : 6;
    const cap = Math.min(maxCap, Math.max(minCap, parseInt(capacity) || (shape === 'round' ? 8 : 10)));
    const table = await prisma.tableLayout.create({
      data: {
        weddingId: req.params.weddingId,
        name,
        shape: shape || 'round',
        capacity: cap,
        specialType: specialType || null,
        posX: posX || 100,
        posY: posY || 100,
        rotation: 0,
      },
      include: { guests: true },
    });
    res.status(201).json(table);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, shape, capacity } = req.body;
    const maxCap = shape === 'round' ? 12 : 24;
    const minCap = shape === 'round' ? 1 : 6;
    const cap = capacity ? Math.min(maxCap, Math.max(minCap, parseInt(capacity))) : undefined;
    const table = await prisma.tableLayout.update({
      where: { id: req.params.id },
      data: { 
        ...(name && { name }),
        ...(shape && { shape }),
        ...(cap && { capacity: cap }),
      },
      include: { guests: true },
    });
    res.json(table);
  } catch (err) { next(err); }
};

exports.updatePosition = async (req, res, next) => {
  try {
    const { posX, posY, rotation } = req.body;
    const table = await prisma.tableLayout.update({
      where: { id: req.params.id },
      data: { posX, posY, rotation: rotation || 0 },
    });
    res.json(table);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.guest.updateMany({ where: { tableId: req.params.id }, data: { tableId: null } });
    await prisma.tableLayout.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.saveLayout = async (req, res, next) => {
  try {
    const { tables } = req.body;
    const updates = tables.map((t) =>
      prisma.tableLayout.update({ where: { id: t.id }, data: { posX: t.posX, posY: t.posY, rotation: t.rotation || 0 } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Układ zapisany' });
  } catch (err) { next(err); }
};

// Dodaj gościa bezpośrednio do stolika (bez wcześniejszego tworzenia w Goście)
exports.addGuestToTable = async (req, res, next) => {
  try {
    const { firstName, lastName, isChild } = req.body;
    const table = await prisma.tableLayout.findUnique({
      where: { id: req.params.id },
      include: { guests: true },
    });
    if (!table) return res.status(404).json({ error: 'Stolik nie znaleziony' });
    if (table.guests.length >= table.capacity) return res.status(400).json({ error: 'Stolik jest pełny' });
    const guest = await prisma.guest.create({
      data: {
        weddingId: table.weddingId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isChild: isChild || false,
        tableId: table.id,
      },
    });
    res.status(201).json(guest);
  } catch (err) { next(err); }
};

// Przypisz istniejącego gościa do stolika
exports.assignGuest = async (req, res, next) => {
  try {
    const { guestId, tableId } = req.body;
    const table = tableId ? await prisma.tableLayout.findUnique({
      where: { id: tableId },
      include: { guests: true },
    }) : null;
    if (table && table.guests.length >= table.capacity) {
      return res.status(400).json({ error: 'Stolik jest pełny' });
    }
    const guest = await prisma.guest.update({
      where: { id: guestId },
      data: { tableId: tableId || null },
    });
    res.json(guest);
  } catch (err) { next(err); }
};

// Upload rzutu sali
exports.uploadFloorPlan = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    const path = await uploadFile(req.file.buffer, 'documents', `floorplan-${req.params.weddingId}`, req.file.mimetype);
    await prisma.wedding.update({
      where: { id: req.params.weddingId },
      data: { floorPlan: path },
    });
    res.json({ path });
  } catch (err) { next(err); }
};

// Pobierz URL rzutu sali
exports.getFloorPlan = async (req, res, next) => {
  try {
    const wedding = await prisma.wedding.findUnique({ where: { id: req.params.weddingId } });
    if (!wedding?.floorPlan) return res.json({ url: null });
    const url = await getSignedUrl('documents', wedding.floorPlan, 3600);
    res.json({ url });
  } catch (err) { next(err); }
};
