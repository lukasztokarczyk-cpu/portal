const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin
  const adminPassword = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@perlapienin.pl' },
    update: {},
    create: { email: 'admin@perlapienin.pl', password: adminPassword, name: 'Administrator', role: 'admin' },
  });

  // Coordinator
  const coordPassword = await bcrypt.hash('Coord1234!', 12);
  const coordinator = await prisma.user.upsert({
    where: { email: 'koordynator@perlapienin.pl' },
    update: {},
    create: { email: 'koordynator@perlapienin.pl', password: coordPassword, name: 'Anna Kowalska', role: 'coordinator' },
  });

  // Couple
  const couplePassword = await bcrypt.hash('Para1234!', 12);
  const couple = await prisma.user.upsert({
    where: { email: 'para@example.com' },
    update: {},
    create: {
      email: 'para@example.com',
      password: couplePassword,
      name: 'Marta i Piotr Nowak',
      role: 'couple',
      wedding: {
        create: {
          weddingDate: new Date('2025-06-15'),
          guestCount: 120,
          coordinatorId: coordinator.id,
        },
      },
    },
  });

  const wedding = await prisma.wedding.findUnique({ where: { coupleId: couple.id } });

  // Stages
  const stages = [
    { title: 'Wybór menu', status: 'completed', order: 1, dueDate: new Date('2025-03-01') },
    { title: 'Potwierdzenie listy gości', status: 'in_progress', order: 2, dueDate: new Date('2025-04-01') },
    { title: 'Rozmieszczenie stolików', status: 'open', order: 3, dueDate: new Date('2025-05-01') },
    { title: 'Próba generalna', status: 'open', order: 4, dueDate: new Date('2025-06-10') },
    { title: 'Finalizacja szczegółów', status: 'open', order: 5, dueDate: new Date('2025-06-12') },
  ];

  for (const stage of stages) {
    await prisma.stage.create({ data: { ...stage, weddingId: wedding.id } });
  }

  // Menu categories and items
  const categories = [
    { name: 'Dania główne', order: 1 },
    { name: 'Desery', order: 2 },
    { name: 'Napoje', order: 3 },
    { name: 'Alkohol', order: 4 },
  ];

  for (const cat of categories) {
    const created = await prisma.menuCategory.create({ data: cat });
    if (cat.name === 'Dania główne') {
      await prisma.menuItem.createMany({
        data: [
          { categoryId: created.id, name: 'Polędwica wołowa', pricePerPerson: 85, description: 'Z warzywami sezonowymi' },
          { categoryId: created.id, name: 'Filet z łososia', pricePerPerson: 75, description: 'Z sosem cytrynowym' },
          { categoryId: created.id, name: 'Pierś z kaczki', pricePerPerson: 80, description: 'Z sosem wiśniowym' },
        ],
      });
    }
    if (cat.name === 'Desery') {
      await prisma.menuItem.createMany({
        data: [
          { categoryId: created.id, name: 'Tort weselny (slice)', pricePerPerson: 25 },
          { categoryId: created.id, name: 'Lody z owocami', pricePerPerson: 18 },
        ],
      });
    }
    if (cat.name === 'Napoje') {
      await prisma.menuItem.createMany({
        data: [
          { categoryId: created.id, name: 'Woda mineralna', pricePerPerson: 8 },
          { categoryId: created.id, name: 'Soki owocowe', pricePerPerson: 10 },
          { categoryId: created.id, name: 'Kawa i herbata', pricePerPerson: 12 },
        ],
      });
    }
    if (cat.name === 'Alkohol') {
      await prisma.menuItem.createMany({
        data: [
          { categoryId: created.id, name: 'Wódka (0.5L/stół)', pricePerPerson: 30 },
          { categoryId: created.id, name: 'Wino białe', pricePerPerson: 35 },
          { categoryId: created.id, name: 'Wino czerwone', pricePerPerson: 35 },
        ],
      });
    }
  }

  // Payments
  await prisma.payment.createMany({
    data: [
      { weddingId: wedding.id, title: 'Zaliczka rezerwacyjna', amount: 5000, status: 'paid', paidAt: new Date('2024-09-01'), dueDate: new Date('2024-09-01') },
      { weddingId: wedding.id, title: 'II rata - menu i sala', amount: 10000, status: 'unpaid', dueDate: new Date('2025-04-01') },
      { weddingId: wedding.id, title: 'Płatność końcowa', amount: 20000, status: 'unpaid', dueDate: new Date('2025-06-10') },
    ],
  });

  // Guests
  const guestData = [
    { firstName: 'Jan', lastName: 'Kowalski', isChild: false, diet: null },
    { firstName: 'Maria', lastName: 'Kowalska', isChild: false, diet: 'wegetariańska' },
    { firstName: 'Tomek', lastName: 'Wiśniewski', isChild: true, diet: null },
    { firstName: 'Anna', lastName: 'Zielińska', isChild: false, diet: null },
    { firstName: 'Marek', lastName: 'Lewandowski', isChild: false, diet: 'bezglutenowa' },
  ];

  for (const g of guestData) {
    await prisma.guest.create({ data: { ...g, weddingId: wedding.id } });
  }

  // Tables
  await prisma.tableLayout.createMany({
    data: [
      { weddingId: wedding.id, name: 'Stół Pary Młodej', shape: 'rectangular', capacity: 10, posX: 350, posY: 50 },
      { weddingId: wedding.id, name: 'Stolik 1', shape: 'round', capacity: 8, posX: 100, posY: 200 },
      { weddingId: wedding.id, name: 'Stolik 2', shape: 'round', capacity: 8, posX: 300, posY: 200 },
      { weddingId: wedding.id, name: 'Stolik 3', shape: 'round', capacity: 8, posX: 500, posY: 200 },
    ],
  });

  // Messages
  await prisma.message.create({
    data: {
      weddingId: wedding.id,
      senderId: coordinator.id,
      content: 'Witamy w systemie Strefa Pary Młodej! Jestem Waszą koordynatorką Anna. Zapraszam do uzupełnienia szczegółów wesela.',
    },
  });

  console.log('✅ Seed zakończony!');
  console.log('\nDane logowania:');
  console.log('Admin:        admin@perlapienin.pl / Admin1234!');
  console.log('Koordynator:  koordynator@perlapienin.pl / Coord1234!');
  console.log('Para Młoda:   para@example.com / Para1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
