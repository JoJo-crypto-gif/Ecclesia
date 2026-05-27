import bcrypt from 'bcrypt';
import crypto from 'crypto';
import UsersModel from '../models/usersModel.js';
import SettingsModel from '../models/settingsModel.js';
import EmailService from '../services/emailService.js';
import MembersModel from '../models/membersModel.js';
import { sendSms } from '../services/messagingService.js';
import AuditService from '../services/auditService.js';

const SALT_ROUNDS = 10;
const TEMP_PASSWORD_EXPIRES_MINUTES = 30;
const TEMP_PASSWORD_EXPIRES_MS = TEMP_PASSWORD_EXPIRES_MINUTES * 60 * 1000;
const FORGOT_PASSWORD_RESPONSE = 'If an account exists, we sent reset instructions.';
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieSameSite = (process.env.SESSION_COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase();

const AuthController = {
  async forgotPassword(req, res, next) {
    try {
      const normalizedEmail = typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

      if (normalizedEmail && normalizedEmail.includes('@')) {
        const user = await UsersModel.findByEmail(normalizedEmail);

        if (user) {
          const temporaryPassword = generateTemporaryPassword();
          const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
          const expiresAt = new Date(Date.now() + TEMP_PASSWORD_EXPIRES_MS).toISOString();

          await UsersModel.update(user.id, {
            temporaryPasswordHash,
            temporaryPasswordExpiresAt: expiresAt,
            passwordResetRequestedAt: new Date().toISOString(),
            mustChangePassword: true,
          });

          const sent = await EmailService.sendPasswordReset(
            user.email,
            temporaryPassword,
            TEMP_PASSWORD_EXPIRES_MINUTES
          );

          if (sent) {
            AuditService.log({
              req,
              user: null,
              action: 'UPDATE',
              module: 'auth',
              recordId: user.id,
              recordName: user.name || user.email,
              description: `Password reset requested for ${user.name || user.email}`,
            });
          } else {
            await UsersModel.update(user.id, {
              temporaryPasswordHash: null,
              temporaryPasswordExpiresAt: null,
              passwordResetRequestedAt: null,
              mustChangePassword: false,
            });
          }
        }
      }

      return res.json({ success: true, message: FORGOT_PASSWORD_RESPONSE });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required' },
        });
      }

      let user = await UsersModel.findByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' },
        });
      }

      const normalPasswordOk = await bcrypt.compare(password, user.password_hash);
      let temporaryPasswordOk = false;

      if (!normalPasswordOk && user.must_change_password && user.temporary_password_hash) {
        const expiresAt = user.temporary_password_expires_at
          ? new Date(user.temporary_password_expires_at)
          : null;

        if (!expiresAt || expiresAt <= new Date()) {
          return res.status(401).json({
            success: false,
            error: { message: 'Invalid email or password' },
          });
        }

        temporaryPasswordOk = await bcrypt.compare(password, user.temporary_password_hash);
      }

      if (!normalPasswordOk && !temporaryPasswordOk) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' },
        });
      }

      if (normalPasswordOk && (user.must_change_password || user.temporary_password_hash)) {
        await UsersModel.update(user.id, {
          temporaryPasswordHash: null,
          temporaryPasswordExpiresAt: null,
          passwordResetRequestedAt: null,
          mustChangePassword: false,
        });
        user = await UsersModel.findById(user.id);
      }

      if (temporaryPasswordOk) {
        const safeUser = toSafeUser({ ...user, must_change_password: true });
        return createSession(req, res, next, safeUser, {
          action: 'LOGIN',
          description: `User ${safeUser.name || safeUser.email} logged in with a temporary password`,
        });
      }

      // Check MFA requirement
      const mfaMode = await SettingsModel.getSetting('mfa_mode') || 'optional';
      let requiresMfa = false;

      if (mfaMode === 'enforced') {
        let enforcedRoles = [];
        try {
          const enforcedRolesStr = await SettingsModel.getSetting('mfa_enforced_roles');
          enforcedRoles = enforcedRolesStr ? JSON.parse(enforcedRolesStr) : [];
        } catch (e) {}

        if (enforcedRoles.length === 0 || enforcedRoles.includes(user.role_id)) {
          requiresMfa = true;
        }
      } else if (mfaMode === 'optional') {
        if (user.mfa_enabled) {
          requiresMfa = true;
        }
      }

      if (requiresMfa) {
        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Expiry in 10 mins
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await UsersModel.update(user.id, {
          mfaCode: code,
          mfaCodeExpiresAt: expiresAt
        });

        let channel = 'email';
        let recipient = maskEmail(user.email);
        let phoneToSend = null;

        if (user.member_id) {
          try {
            const member = await MembersModel.findById(user.member_id);
            if (member && member.phone) {
              phoneToSend = member.phone;
            }
          } catch (err) {
            console.error('Error fetching member phone for MFA:', err);
          }
        }

        if (phoneToSend) {
          channel = 'sms';
          recipient = maskPhone(phoneToSend);
          try {
            await sendSms(`Your Ecclesia security code is: ${code}. It expires in 10 minutes.`, [phoneToSend]);
          } catch (err) {
            console.error('Error sending SMS MFA code:', err);
          }
        } else {
          await EmailService.sendOTP(user.email, code);
        }

        return res.json({
          success: true,
          mfaRequired: true,
          userId: user.id,
          channel,
          recipient,
          message: `MFA code sent via ${channel}`
        });
      }

      return createSession(req, res, next, toSafeUser(user), {
        action: 'LOGIN',
        description: `User ${user.name || user.email} logged in`,
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyMfa(req, res, next) {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ success: false, error: { message: 'userId and code are required' } });
      }

      const user = await UsersModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }

      if (!user.mfa_code || user.mfa_code !== code) {
        return res.status(401).json({ success: false, error: { message: 'Invalid code' } });
      }

      if (new Date(user.mfa_code_expires_at) < new Date()) {
        return res.status(401).json({ success: false, error: { message: 'Code has expired. Please log in again to request a new code.' } });
      }

      // Clear the code
      await UsersModel.update(user.id, { mfaCode: null, mfaCodeExpiresAt: null });

      return createSession(req, res, next, toSafeUser(user), {
        action: 'LOGIN',
        description: `User ${user.name || user.email} logged in via MFA`,
      });
    } catch (err) {
      next(err);
    }
  },

  async completePasswordReset(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }
      if (!sessionUser.mustChangePassword) {
        return res.status(403).json({ success: false, error: { message: 'Password reset is not required for this session' } });
      }

      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'newPassword is required' } });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, error: { message: 'New password must be at least 8 characters' } });
      }

      const user = await UsersModel.findById(sessionUser.id);
      if (!user || !user.must_change_password || !user.temporary_password_hash) {
        return res.status(400).json({ success: false, error: { message: 'Password reset is no longer available' } });
      }

      const sameAsTemporaryPassword = await bcrypt.compare(newPassword, user.temporary_password_hash);
      if (sameAsTemporaryPassword) {
        return res.status(400).json({ success: false, error: { message: 'New password must be different from the temporary password' } });
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await UsersModel.update(user.id, {
        passwordHash,
        temporaryPasswordHash: null,
        temporaryPasswordExpiresAt: null,
        passwordResetRequestedAt: null,
        mustChangePassword: false,
        mfaCode: null,
        mfaCodeExpiresAt: null,
      });

      AuditService.log({
        req,
        user: sessionUser,
        action: 'UPDATE',
        module: 'auth',
        recordId: user.id,
        recordName: user.name || user.email,
        description: `User ${user.name || user.email} completed password reset`,
      });

      req.session.destroy(() => {
        res.clearCookie('ecclesia.sid', {
          httpOnly: true,
          sameSite: sessionCookieSameSite,
          secure: isProduction,
        });
        return res.json({ success: true, message: 'Password updated. Please sign in with your new password.' });
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      if (!req.session) {
        return res.json({ success: true });
      }
      const user = req.session.user;
      req.session.destroy(() => {
        res.clearCookie('ecclesia.sid', {
          httpOnly: true,
          sameSite: sessionCookieSameSite,
          secure: isProduction,
        });
        if (user) {
          AuditService.log({
            req,
            user,
            action: 'LOGOUT',
            module: 'auth',
            recordId: user.id,
            recordName: user.name || user.email,
            description: `User ${user.name || user.email} logged out`,
          });
        }
        res.json({ success: true });
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    }
    return res.json({ success: true, data: req.session.user });
  },

  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  },
};

function createSession(req, res, next, safeUser, { action, description }) {
  if (!req.session) {
    return res.status(500).json({
      success: false,
      error: { message: 'Session is not available' },
    });
  }

  return req.session.regenerate((regenErr) => {
    if (regenErr) {
      return next(regenErr);
    }

    req.session.user = safeUser;
    return req.session.save((saveErr) => {
      if (saveErr) {
        return next(saveErr);
      }
      AuditService.log({
        req,
        user: safeUser,
        action,
        module: 'auth',
        recordId: safeUser.id,
        recordName: safeUser.name || safeUser.email,
        description,
      });
      return res.json({ success: true, data: safeUser });
    });
  });
}

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.role_id,
    permissions: user.permissions || {},
    memberId: user.member_id,
    zoneId: user.zone_id,
    mfaEnabled: user.mfa_enabled,
    mustChangePassword: Boolean(user.must_change_password),
  };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(Math.min(5, local.length - 2))}${local[local.length - 1]}`
    : `${local[0]}*`;
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return '***';
  return `•••• •••• ${cleaned.slice(-4)}`;
}

export default AuthController;
