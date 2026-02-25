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

// Upload rzutu sali (globalny dla całego obiektu)
exports.uploadFloorPlan = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Brak pliku' });
    const { uploadFile } = require('../utils/supabaseStorage');
    const path = await uploadFile(req.file.buffer, 'documents', req.file.originalname, req.file.mimetype);
    // Zapisz ścieżkę w specjalnym rekordzie - używamy weddingId jako klucza ale URL jest globalny
    await prisma.wedding.update({
      where: { id: req.params.weddingId },
      data: { floorPlan: path },
    });
    // Ustaw ten sam rzut dla wszystkich wesel
    await prisma.wedding.updateMany({
      data: { floorPlan: path },
    });
    res.json({ path });
  } catch (err) { next(err); }
};

// Pobierz URL rzutu sali (globalny)
exports.getFloorPlan = async (req, res, next) => {
  try {
    // Pobierz rzut z dowolnego wesela (globalny)
    const wedding = await prisma.wedding.findFirst({
      where: { floorPlan: { not: null } },
    });
    if (!wedding?.floorPlan) return res.json({ url: null });
    const { getSignedUrl } = require('../utils/supabaseStorage');
    const url = await getSignedUrl('documents', wedding.floorPlan, 3600);
    res.json({ url });
  } catch (err) { next(err); }
};

exports.sendPlanByEmail = async (req, res, next) => {
  try {
    const { weddingId } = req.params;

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        couple: { select: { name: true, email: true, login: true } },
        tables: {
          include: {
            guests: { select: { firstName: true, lastName: true, isChild: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!wedding) return res.status(404).json({ error: 'Wesele nie znalezione' });
    if (!wedding.couple?.email) return res.status(400).json({ error: 'Para nie ma adresu email' });

    // Zbuduj treść HTML emaila
    const tableRows = wedding.tables.map(t => {
      const guestList = t.guests.map(g => `${g.firstName} ${g.lastName}${g.isChild ? ' (dziecko)' : ''}`).join(', ') || '— brak gości';
      return `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">${t.name}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">${t.guests.length}/${t.capacity}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;color:#6b7280">${guestList}</td>
        </tr>`;
    }).join('');

    const html = `
      <div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#1f2937">
        <h1 style="color:#e11d48;margin-bottom:4px">Plan stołów weselnych</h1>
        <p style="color:#6b7280;margin-bottom:24px">${wedding.couple.name} • ${wedding.weddingDate ? new Date(wedding.weddingDate).toLocaleDateString('pl-PL') : ''}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#fff1f2">
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:left">Stolik</th>
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:center">Miejsca</th>
              <th style="padding:10px;border:1px solid #e5e7eb;text-align:left">Goście</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">Wygenerowano przez system Pensjonatu Perła Pienin</p>
      </div>`;

    // Wyślij przez Supabase (używamy nodemailer lub prostego fetch)
    // Na razie zwracamy sukces — email można skonfigurować przez Resend/SendGrid
    // Logujemy do konsoli jako fallback
    console.log(`[EMAIL] Plan stołów dla: ${wedding.couple.email}`);

    // Spróbuj wysłać przez prosty SMTP jeśli skonfigurowany
    const nodemailer = require('nodemailer');
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@perlapienin.pl',
        to: wedding.couple.email,
        subject: `Plan stołów — ${wedding.couple.name}`,
        html,
      });
      res.json({ ok: true, sentTo: wedding.couple.email, html });
    } else {
      // Brak SMTP — zwróć HTML do podglądu
      res.json({ ok: true, noSmtp: true, html, coupleEmail: wedding.couple.email });
    }
  } catch (err) { next(err); }
};
