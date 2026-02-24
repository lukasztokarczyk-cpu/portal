const prisma = require('../prisma/client');

// ── POKOJE (admin) ──────────────────────────────────────

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
      include: { bookings: { include: { wedding: { include: { couple: { select: { name: true } } } } } } },
    });
    res.json(rooms);
  } catch (err) { next(err); }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { name, description, capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'Nazwa jest wymagana' });
    const room = await prisma.room.create({ data: { name, description, capacity: parseInt(capacity) || 2 } });
    res.status(201).json(room);
  } catch (err) { next(err); }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { name, description, capacity, isAvailable } = req.body;
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });
    res.json(room);
  } catch (err) { next(err); }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    await prisma.room.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

// ── KONFIGURACJA NOCLEGU WESELA ──────────────────────────

exports.getConfig = async (req, res, next) => {
  try {
    const { weddingId } = req.params;

    // Access control dla pary
    if (req.user.role === 'couple') {
      const wedding = await prisma.wedding.findUnique({ where: { coupleId: req.user.id } });
      if (!wedding || wedding.id !== weddingId) return res.status(403).json({ error: 'Brak dostępu' });
    }

    const config = await prisma.accommodationConfig.findUnique({ where: { weddingId } });
    res.json(config || { weddingId, wantsStay: null });
  } catch (err) { next(err); }
};

exports.setWantsStay = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { wantsStay } = req.body;

    const config = await prisma.accommodationConfig.upsert({
      where: { weddingId },
      create: { weddingId, wantsStay },
      update: { wantsStay },
    });

    // Jeśli zmieniono na NIE — usuń wszystkie rezerwacje tego wesela
    if (wantsStay === false) {
      await prisma.roomBooking.deleteMany({ where: { weddingId } });
    }

    res.json(config);
  } catch (err) { next(err); }
};

// ── REZERWACJE ──────────────────────────────────────────

exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { weddingId } = req.params;

    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) return res.status(404).json({ error: 'Wesele nie znalezione' });

    // Dozwolone daty: dzień przed, dzień wesela, dzień po
    const weddingDay = new Date(wedding.weddingDate);
    weddingDay.setHours(0, 0, 0, 0);
    const dayBefore = new Date(weddingDay); dayBefore.setDate(weddingDay.getDate() - 1);
    const dayAfter = new Date(weddingDay); dayAfter.setDate(weddingDay.getDate() + 1);

    const allowedDates = [dayBefore, weddingDay, dayAfter];

    // Pobierz pokoje z info o rezerwacjach
    const rooms = await prisma.room.findMany({
      where: { isAvailable: true },
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          where: { weddingId: { not: weddingId } }, // rezerwacje innych wesel
          select: { checkIn: true, checkOut: true },
        },
      },
    });

    // Rezerwacje tego wesela
    const myBookings = await prisma.roomBooking.findMany({
      where: { weddingId },
      include: { room: true },
    });

    res.json({ rooms, allowedDates: allowedDates.map(d => d.toISOString()), myBookings });
  } catch (err) { next(err); }
};

exports.bookRoom = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { roomId, checkIn, checkOut, guestCount, notes } = req.body;

    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) return res.status(404).json({ error: 'Wesele nie znalezione' });

    // Walidacja dat — tylko dozwolone daty
    const weddingDay = new Date(wedding.weddingDate);
    weddingDay.setHours(0, 0, 0, 0);
    const dayBefore = new Date(weddingDay); dayBefore.setDate(weddingDay.getDate() - 1);
    const dayAfter = new Date(weddingDay); dayAfter.setDate(weddingDay.getDate() + 1);

    const checkInDate = new Date(checkIn);
    checkInDate.setHours(0, 0, 0, 0);

    const isAllowed = [dayBefore, weddingDay, dayAfter].some(
      d => d.getTime() === checkInDate.getTime()
    );
    if (!isAllowed) return res.status(400).json({ error: 'Niedozwolona data rezerwacji' });

    // Sprawdź czy pokój jest wolny
    const conflict = await prisma.roomBooking.findFirst({
      where: { roomId, checkIn: new Date(checkIn) },
    });
    if (conflict) return res.status(409).json({ error: 'Pokój jest już zajęty w tym terminie' });

    const booking = await prisma.roomBooking.create({
      data: {
        weddingId,
        roomId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        guestCount: parseInt(guestCount) || 2,
        notes,
      },
      include: { room: true },
    });
    res.status(201).json(booking);
  } catch (err) { next(err); }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    await prisma.roomBooking.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
};

// Admin: wszystkie rezerwacje
exports.getAllBookings = async (req, res, next) => {
  try {
    const bookings = await prisma.roomBooking.findMany({
      orderBy: { checkIn: 'asc' },
      include: {
        room: true,
        wedding: { include: { couple: { select: { name: true, login: true } } } },
      },
    });
    res.json(bookings);
  } catch (err) { next(err); }
};
