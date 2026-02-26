const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Oblicz wiek na podstawie daty urodzenia i daty wesela
function calcAge(dateOfBirth, weddingDate) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const wed = new Date(weddingDate);
  let age = wed.getFullYear() - dob.getFullYear();
  const m = wed.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && wed.getDate() < dob.getDate())) age--;
  return age;
}

// Generuj lub odśwież podsumowanie wesela
async function generateSummary(weddingId) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    include: {
      guests: true,
      tables: true,
      menuConfig: true,
      roomBookings: {
        include: {
          room: { select: { id: true, name: true, capacity: true } },
        },
      },
      payments: {
        where: { status: 'paid' },
        select: { amount: true, title: true },
      },
    },
  });
  if (!wedding) throw new Error('Wesele nie znalezione');

  const weddingDate = wedding.weddingDate;
  const now = new Date();
  const daysUntil = Math.ceil((new Date(weddingDate) - now) / (1000 * 60 * 60 * 24));
  const isVisible = daysUntil <= 4;

  // Podział gości
  let adultsCount = 0;
  let children3to10 = 0;
  let childrenUnder3 = 0;
  let djCount = 0;

  // Diety
  const dietCounts = {
    standard: 0, vegetarian: 0, vegan: 0,
    glutenfree: 0, lactosefree: 0, glutenlactosefree: 0, other: 0,
  };

  // DJ/Fotograf/Zespół ze stolików specjalnych
  const djTables = wedding.tables.filter(t => ['dj', 'photographer'].includes(t.specialType));
  djTables.forEach(t => { djCount += t.capacity; });

  // Goście
  for (const guest of wedding.guests) {
    const age = calcAge(guest.dateOfBirth, weddingDate);

    // Klasyfikacja wiekowa
    if (guest.isChild && age !== null && age < 3) {
      childrenUnder3++;
    } else if (guest.isChild && age !== null && age < 10) {
      children3to10++;
    } else if (guest.isChild && age === null) {
      // isChild ale bez daty — traktuj jako 3-10
      children3to10++;
    } else {
      adultsCount++;
    }

    // Dieta
    const diet = (guest.diet || 'standard').toLowerCase();
    if (dietCounts[diet] !== undefined) {
      dietCounts[diet]++;
    } else {
      dietCounts.other++;
    }
  }

  // Koszty
  const pricePerPerson = wedding.pricePerPerson ? parseFloat(wedding.pricePerPerson) : null;
  const menuConfig = wedding.menuConfig;

  let baseCost = null, childrenCost = null, djCost = null;
  let cakeCost = null, sweetTableCost = null, packagesCost = null, totalCost = null;

  if (pricePerPerson) {
    baseCost = adultsCount * pricePerPerson;
    childrenCost = children3to10 * pricePerPerson * 0.5;
    djCost = djCount * pricePerPerson * 0.5;

    // Słodki stół
    if (menuConfig?.sweetTableChoice === 'nas' && menuConfig?.sweetTableAmount) {
      sweetTableCost = parseFloat(menuConfig.sweetTableAmount);
    }

    // Paczki
    if (menuConfig?.guestPackageChoice === 'nas' && menuConfig?.guestPackagePrice && menuConfig?.guestPackageCount) {
      packagesCost = parseFloat(menuConfig.guestPackagePrice) * menuConfig.guestPackageCount;
    }

    // Tort — na razie bez ceny, bo cena tortu jest ustalana indywidualnie
    cakeCost = null;

    totalCost = baseCost + childrenCost + djCost
      + (sweetTableCost || 0)
      + (packagesCost || 0);
  }

  // Wpłacone zaliczki
  const paidAmount = wedding.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Noclegi
  const bookedRooms = wedding.roomBookings.map(b => ({
    roomName: b.room.name,
    guestCount: b.guestCount,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    notes: b.notes,
  }));
  const roomsCount = wedding.roomBookings.length;

  const summaryData = {
    isVisible,
    adultsCount,
    children3to10,
    childrenUnder3,
    djCount,
    dietStandard: dietCounts.standard,
    dietVegetarian: dietCounts.vegetarian,
    dietVegan: dietCounts.vegan,
    dietGlutenFree: dietCounts.glutenfree,
    dietLactoseFree: dietCounts.lactosefree,
    dietGlutenLactoseFree: dietCounts.glutenlactosefree,
    dietOther: dietCounts.other,
    pricePerPerson,
    baseCost,
    childrenCost,
    djCost,
    cakeCost,
    sweetTableCost,
    packagesCost,
    totalCost,
    paidAmount: pricePerPerson ? paidAmount : null,
    remainingCost: pricePerPerson && totalCost ? totalCost - paidAmount : null,
    cakeSource: menuConfig?.cakeSource || null,
    cakeFlavors: menuConfig?.cakeFlavors || null,
    sweetTableChoice: menuConfig?.sweetTableChoice || null,
    guestPackageChoice: menuConfig?.guestPackageChoice || null,
    guestPackageCount: menuConfig?.guestPackageCount || null,
    updatedAt: new Date(),
  };

  const summary = await prisma.weddingSummary.upsert({
    where: { weddingId },
    create: { weddingId, ...summaryData },
    update: summaryData,
  });

  return { summary, daysUntil, weddingDate, bookedRooms, roomsCount };
}

// GET /api/summary/wedding/:weddingId
exports.getSummary = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { summary, daysUntil, weddingDate, bookedRooms, roomsCount } = await generateSummary(weddingId);
    res.json({ summary, daysUntil, weddingDate, bookedRooms, roomsCount });
  } catch (err) { next(err); }
};

// PATCH /api/summary/wedding/:weddingId/price — admin ustawia cenę
exports.setPrice = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const { pricePerPerson } = req.body;
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : null },
    });
    const { summary, daysUntil, bookedRooms, roomsCount } = await generateSummary(weddingId);
    res.json({ summary, daysUntil, bookedRooms, roomsCount });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { weddingId } = req.params;
    const result = await generateSummary(weddingId);
    res.json(result);
  } catch (err) { next(err); }
};

// Cron — sprawdź wszystkie wesela i ustaw isVisible = true jeśli 4 dni przed
exports.cronCheck = async () => {
  try {
    const now = new Date();
    const in4days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const weddings = await prisma.wedding.findMany({
      where: {
        weddingDate: { gte: now, lte: in5days },
      },
      select: { id: true },
    });

    for (const w of weddings) {
      await generateSummary(w.id);
    }
    console.log(`[CRON] Sprawdzono ${weddings.length} wesel`);
  } catch (err) {
    console.error('[CRON] Błąd:', err.message);
  }
};
