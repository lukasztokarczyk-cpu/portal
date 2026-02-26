require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const weddingRoutes = require('./routes/wedding.routes');
const stageRoutes = require('./routes/stage.routes');
const guestRoutes = require('./routes/guest.routes');
const tableRoutes = require('./routes/table.routes');
const menuRoutes = require('./routes/menu.routes');
const paymentRoutes = require('./routes/payment.routes');
const documentRoutes = require('./routes/document.routes');
const messageRoutes = require('./routes/message.routes');
const accommodationRoutes = require('./routes/accommodation.routes');
const summaryRoutes = require('./routes/summary.routes');
const { errorHandler } = require('./middleware/errorHandler');
const prisma = require('./prisma/client');

const app = express();

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (dev only – na produkcji pliki są w Supabase Storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weddings', weddingRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/accommodation', accommodationRoutes);
app.use('/api/summary', summaryRoutes);

// Cron — sprawdzaj co godzinę czy wesela są 4 dni przed
const { cronCheck } = require('./controllers/summary.controller');
setInterval(cronCheck, 60 * 60 * 1000); // co godzinę
cronCheck(); // uruchom od razu przy starcie

// Health check (używany też przez keep-alive)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'Strefa Pary Młodej API', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🎊 Strefa Pary Młodej API running on port ${PORT}`);
  startKeepAlive();
});

/**
 * Keep-alive: pinguje własny /api/health co 14 minut.
 * Zapobiega "zasypianiu" Render free tier (usypia po 15 min).
 * Przy okazji robi SELECT 1 do Supabase – zapobiega pauzowaniu projektu.
 * Działa tylko na produkcji (NODE_ENV=production).
 */
function startKeepAlive() {
  if (process.env.NODE_ENV !== 'production') return;
  const selfUrl = process.env.SELF_URL;
  if (!selfUrl) {
    console.log('⚠️  Keep-alive wyłączony – ustaw SELF_URL w zmiennych środowiskowych');
    return;
  }

  const INTERVAL_MS = 14 * 60 * 1000; // 14 minut
  console.log(`💓 Keep-alive aktywny → ping co 14 min na ${selfUrl}/api/health`);

  setInterval(async () => {
    try {
      const https = require('https');
      const http = require('http');
      const client = selfUrl.startsWith('https') ? https : http;
      client.get(`${selfUrl}/api/health`, (res) => {
        console.log(`💓 Keep-alive ping: ${res.statusCode}`);
      }).on('error', (e) => {
        console.warn(`💓 Keep-alive błąd: ${e.message}`);
      });
    } catch (e) {
      console.warn('💓 Keep-alive wyjątek:', e.message);
    }
  }, INTERVAL_MS);
}

module.exports = app;
