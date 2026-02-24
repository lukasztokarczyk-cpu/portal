const prisma = require('../prisma/client');

const getWeddingForUser = async (user) => {
  if (user.role === 'couple') {
    return prisma.wedding.findUnique({ where: { coupleId: user.id } });
  }
  return null;
};

exports.getAll = async (req, res, next) => {
  try {
    const weddings = await prisma.wedding.findMany({
      include: { couple: { select: { id: true, name: true, email: true } }, coordinator: { select: { id: true, name: true } } },
      orderBy: { weddingDate: 'asc' },
    });
    res.json(weddings);
  } catch (err) {
    next(err);
  }
};

exports.getMy = async (req, res, next) => {
  try {
    let wedding;
    if (req.user.role === 'couple') {
      wedding = await prisma.wedding.findUnique({
        where: { coupleId: req.user.id },
        include: {
          coordinator: { select: { id: true, name: true, email: true } },
          stages: { orderBy: { order: 'asc' } },
          guests: true,
          payments: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { name: true } } } },
        },
      });
    } else if (req.user.role === 'coordinator') {
      wedding = await prisma.wedding.findFirst({
        where: { coordinatorId: req.user.id },
        include: {
          couple: { select: { id: true, name: true, email: true } },
          stages: { orderBy: { order: 'asc' } },
          guests: true,
          payments: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { name: true } } } },
        },
      });
    }

    if (!wedding) return res.status(404).json({ error: 'Nie znaleziono wesela' });

    const today = new Date();
    const daysToWedding = Math.ceil((new Date(wedding.weddingDate) - today) / (1000 * 60 * 60 * 24));
    const completedStages = wedding.stages.filter((s) => s.status === 'completed').length;
    const progressPercent = wedding.stages.length > 0 ? Math.round((completedStages / wedding.stages.length) * 100) : 0;
    const totalPayments = wedding.payments.reduce((s, p) => s + Number(p.amount), 0);
    const paidAmount = wedding.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const balance = totalPayments - paidAmount;
    const nextTask = wedding.stages.find((s) => s.status !== 'completed');

    res.json({
      ...wedding,
      dashboard: {
        daysToWedding,
        progressPercent,
        guestCount: wedding.guests.length,
        balance,
        paidAmount,
        totalPayments,
        nextTask,
        lastMessage: wedding.messages[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      include: {
        couple: { select: { id: true, name: true, email: true } },
        coordinator: { select: { id: true, name: true, email: true } },
      },
    });
    if (!wedding) return res.status(404).json({ error: 'Nie znaleziono wesela' });

    if (req.user.role === 'couple' && wedding.coupleId !== req.user.id) {
      return res.status(403).json({ error: 'Brak dostępu' });
    }
    res.json(wedding);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { weddingDate, guestCount, coordinatorId, coupleName, coupleLogin, couplePassword } = req.body;

    // Zaktualizuj dane wesela
    const wedding = await prisma.wedding.update({
      where: { id: req.params.id },
      data: {
        ...(weddingDate && { weddingDate: new Date(weddingDate) }),
        ...(guestCount !== undefined && { guestCount }),
        ...(coordinatorId !== undefined && { coordinatorId: coordinatorId || null }),
      },
      include: { couple: { select: { id: true, name: true, login: true, email: true } } },
    });

    // Zaktualizuj dane pary (użytkownika)
    if (coupleName || coupleLogin || couplePassword) {
      const bcrypt = require('bcryptjs');
      const userData = {};
      if (coupleName) userData.name = coupleName;
      if (coupleLogin) {
        const existing = await prisma.user.findFirst({ where: { login: coupleLogin, NOT: { id: wedding.coupleId } } });
        if (existing) return res.status(409).json({ error: 'Login już zajęty' });
        userData.login = coupleLogin;
      }
      if (couplePassword) userData.password = await bcrypt.hash(couplePassword, 12);
      await prisma.user.update({ where: { id: wedding.coupleId }, data: userData });
    }

    // Zwróć zaktualizowane dane
    const updated = await prisma.wedding.findUnique({
      where: { id: req.params.id },
      include: {
        couple: { select: { id: true, name: true, login: true, email: true } },
        coordinator: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const wedding = await prisma.wedding.findUnique({ where: { id: req.params.id } });
    if (!wedding) return res.status(404).json({ error: 'Wesele nie znalezione' });
    // Cascade delete działa przez Prisma schema (onDelete: Cascade)
    await prisma.wedding.delete({ where: { id: req.params.id } });
    // Usuń też konto pary
    await prisma.user.delete({ where: { id: wedding.coupleId } });
    res.status(204).send();
  } catch (err) { next(err); }
};
