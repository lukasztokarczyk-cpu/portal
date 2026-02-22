const prisma = require('../prisma/client');

exports.getByWedding = async (req, res, next) => {
  try {
    const guests = await prisma.guest.findMany({
      where: { weddingId: req.params.weddingId },
      include: { table: { select: { id: true, name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const total = guests.length;
    const children = guests.filter((g) => g.isChild).length;
    res.json({ guests, stats: { total, adults: total - children, children } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { firstName, lastName, isChild, diet, tableId, email, phone, rsvp } = req.body;
    const guest = await prisma.guest.create({
      data: { weddingId: req.params.weddingId, firstName, lastName, isChild: isChild || false, diet, tableId, email, phone, rsvp },
    });
    res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { firstName, lastName, isChild, diet, tableId, email, phone, rsvp } = req.body;
    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: { firstName, lastName, isChild, diet, tableId, email, phone, rsvp },
    });
    res.json(guest);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.guest.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku CSV' });
    const content = req.file.buffer.toString('utf8');
    const lines = content.split('\n').filter((l) => l.trim());
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const created = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      header.forEach((h, idx) => (row[h] = values[idx] || ''));

      if (!row.firstname && !row.firstname) continue;
      created.push(
        await prisma.guest.create({
          data: {
            weddingId: req.params.weddingId,
            firstName: row.firstname || row.imię || '',
            lastName: row.lastname || row.nazwisko || '',
            isChild: row.ischild === 'true' || row.dziecko === 'tak',
            diet: row.diet || row.dieta || null,
            email: row.email || null,
            phone: row.phone || row.telefon || null,
          },
        })
      );
    }
    res.json({ imported: created.length, guests: created });
  } catch (err) {
    next(err);
  }
};

exports.exportPDF = async (req, res, next) => {
  try {
    const guests = await prisma.guest.findMany({
      where: { weddingId: req.params.weddingId },
      include: { table: { select: { name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Simple HTML-based PDF generation
    const rows = guests
      .map(
        (g, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${g.lastName} ${g.firstName}</td>
            <td>${g.isChild ? 'Dziecko' : 'Dorosły'}</td>
            <td>${g.diet || '-'}</td>
            <td>${g.table?.name || '-'}</td>
            <td>${g.rsvp || '-'}</td>
          </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { font-family: Arial, sans-serif; font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
th { background: #f5f5f5; }
h1 { font-size: 18px; }
</style></head>
<body>
<h1>Lista Gości - Perła Pienin</h1>
<p>Łączna liczba gości: ${guests.length} | Dorosłych: ${guests.filter((g) => !g.isChild).length} | Dzieci: ${guests.filter((g) => g.isChild).length}</p>
<table><thead><tr><th>#</th><th>Imię i Nazwisko</th><th>Typ</th><th>Dieta</th><th>Stolik</th><th>RSVP</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lista-gosci.html"');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
