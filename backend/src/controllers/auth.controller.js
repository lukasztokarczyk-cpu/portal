const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prisma/client');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }
    const token = generateToken(user.id);
    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    next(err);
  }
};

exports.registerCouple = async (req, res, next) => {
  try {
    const { email, password, name, weddingDate, coordinatorId } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email już istnieje' });

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: 'couple',
        wedding: {
          create: {
            weddingDate: new Date(weddingDate),
            ...(coordinatorId && { coordinatorId }),
          },
        },
      },
      include: { wedding: true },
    });

    const { password: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 3600000), // 1h
        },
      });
      // TODO: Send email with reset link
      console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
    }
    res.json({ message: 'Jeśli konto istnieje, wysłano email z linkiem do resetowania hasła' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token wygasł lub jest nieprawidłowy' });
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    ]);
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json(userSafe);
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Aktualne hasło jest nieprawidłowe' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (err) {
    next(err);
  }
};
