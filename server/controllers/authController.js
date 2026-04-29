import bcrypt from 'bcrypt';
import UsersModel from '../models/usersModel.js';

const SALT_ROUNDS = 10;

const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required' },
        });
      }

      const user = await UsersModel.findByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' },
        });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' },
        });
      }

      const safeUser = toSafeUser(user);
      if (!req.session) {
        return res.status(500).json({
          success: false,
          error: { message: 'Session is not available' },
        });
      }

      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return next(regenErr);
        }

        req.session.user = safeUser;
        req.session.save((saveErr) => {
          if (saveErr) {
            return next(saveErr);
          }
          return res.json({ success: true, data: safeUser });
        });
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
      req.session.destroy(() => {
        res.clearCookie('ecclesia.sid');
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

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    memberId: user.member_id,
    zoneId: user.zone_id,
  };
}

export default AuthController;
