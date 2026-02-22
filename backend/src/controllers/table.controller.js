const prisma = require('../prisma/client');

exports.getByWedding = async (req, res, next) => {
  try {
    const tables = await prisma.tableLayout.findMany({
      where: { weddingId: req.params.weddingId },
      include: { guests: { select: { id: true, firstName: true, lastName: true, isChild: true } } },
    });
    res.json(tables);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, shape, capacity, posX, posY, rotation } = req.body;
    const table = await prisma.tableLayout.create({
      data: {
        weddingId: req.params.weddingId,
        name,
        shape: shape || 'round',
        capacity: capacity || 8,
        posX: posX || 0,
        posY: posY || 0,
        rotation: rotation || 0,
      },
    });
    res.status(201).json(table);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, shape, capacity } = req.body;
    const table = await prisma.tableLayout.update({
      where: { id: req.params.id },
      data: { name, shape, capacity },
    });
    res.json(table);
  } catch (err) {
    next(err);
  }
};

exports.updatePosition = async (req, res, next) => {
  try {
    const { posX, posY, rotation } = req.body;
    const table = await prisma.tableLayout.update({
      where: { id: req.params.id },
      data: { posX, posY, rotation },
    });
    res.json(table);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Unassign guests from this table first
    await prisma.guest.updateMany({ where: { tableId: req.params.id }, data: { tableId: null } });
    await prisma.tableLayout.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.saveLayout = async (req, res, next) => {
  try {
    const { tables } = req.body; // Array of { id, posX, posY, rotation }
    const updates = tables.map((t) =>
      prisma.tableLayout.update({ where: { id: t.id }, data: { posX: t.posX, posY: t.posY, rotation: t.rotation } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Układ stolików zapisany' });
  } catch (err) {
    next(err);
  }
};
