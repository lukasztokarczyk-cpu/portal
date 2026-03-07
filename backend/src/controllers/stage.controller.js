const prisma = require('../prisma/client');

exports.getByWedding = async (req, res, next) => {
  try {
    const stages = await prisma.stage.findMany({
      where: { weddingId: req.params.weddingId },
      orderBy: { order: 'asc' },
    });
    res.json(stages);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, status, dueDate, notes, order } = req.body;
    const stage = await prisma.stage.create({
      data: {
        weddingId: req.params.weddingId,
        title,
        description,
        status: status || 'open',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        order: order || 0,
      },
    });

    res.status(201).json(stage);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, status, dueDate, notes, order } = req.body;
    const stage = await prisma.stage.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(order !== undefined && { order }),
      },
    });
    res.json(stage);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.stage.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const { order } = req.body;
    const stage = await prisma.stage.update({ where: { id: req.params.id }, data: { order } });
    res.json(stage);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status' });
    }
    // Sprawdź czy stage należy do wesela tej pary lub user jest adminem
    const stage = await prisma.stage.findUnique({
      where: { id: req.params.id },
      include: { wedding: { include: { couple: true } } }
    });
    if (!stage) return res.status(404).json({ error: 'Nie znaleziono' });
    const isOwner = stage.wedding.couple?.id === req.user.id;
    const isAdmin = ['admin', 'coordinator'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Brak dostępu' });

    const updated = await prisma.stage.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(updated);
  } catch (err) { next(err); }
};
