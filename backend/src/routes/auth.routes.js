const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post(
  '/login',
  [body('login').notEmpty().trim(), body('password').notEmpty()],
  validate,
  authController.login
);

router.post(
  '/register-couple',
  authenticate,
  authorize('admin'),
  [
    body('login').notEmpty().trim(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty().trim(),
    body('weddingDate').isISO8601(),
  ],
  validate,
  authController.registerCouple
);

router.post(
  '/forgot-password',
  [body('login').notEmpty().trim()],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 8 })],
  validate,
  authController.resetPassword
);

router.get('/me', authenticate, authController.me);

router.post(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate,
  authController.changePassword
);

module.exports = router;
