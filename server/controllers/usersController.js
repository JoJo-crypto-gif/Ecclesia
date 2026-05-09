import bcrypt from 'bcrypt';
import UsersModel from '../models/usersModel.js';
import MembersModel from '../models/membersModel.js';
import RolesModel from '../models/rolesModel.js';

const SALT_ROUNDS = 10;

const UsersController = {
  async changePassword(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { message: 'currentPassword and newPassword are required' },
        });
      }

      const user = await UsersModel.findById(sessionUser.id);
      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }

      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) {
        return res.status(400).json({ success: false, error: { message: 'Current password is incorrect' } });
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await UsersModel.update(user.id, { passwordHash });

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
  async updateProfile(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: { message: 'name and email are required' },
        });
      }

      const normalizedEmail = email.toLowerCase();
      const existing = await UsersModel.findByEmail(normalizedEmail);
      if (existing && existing.id !== sessionUser.id) {
         return res.status(409).json({ success: false, error: { message: 'Email is already in use by another account' }});
      }

      const updatedUser = await UsersModel.update(sessionUser.id, { name, email: normalizedEmail });
      
      req.session.user = {
        ...sessionUser,
        name: updatedUser.name,
        email: updatedUser.email
      };

      return res.json({ success: true, data: toSafeUser(updatedUser) });
    } catch (err) {
      next(err);
    }
  },
  async upsertZoneLeader(req, res, next) {
    try {
      const { email, password, memberId, zoneId, name } = req.body;
      if (!email || !password || !memberId || !zoneId) {
        return res.status(400).json({
          success: false,
          error: { message: 'email, password, memberId, and zoneId are required' },
        });
      }

      const member = await MembersModel.findById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: { message: 'Member not found' },
        });
      }

      const normalizedEmail = email.toLowerCase();
      const existingByEmail = await UsersModel.findByEmail(normalizedEmail);
      const existingByMember = await UsersModel.findByMemberId(memberId);

      if (existingByEmail && existingByMember && existingByEmail.id !== existingByMember.id) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already in use by another user' },
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      let user;
      if (existingByMember) {
        user = await UsersModel.update(existingByMember.id, {
          name: name || existingByMember.name,
          email: normalizedEmail,
          passwordHash,
          role: 'zone_leader',
          memberId,
          zoneId,
        });
      } else if (existingByEmail) {
        user = await UsersModel.update(existingByEmail.id, {
          name: name || existingByEmail.name,
          passwordHash,
          role: 'zone_leader',
          memberId,
          zoneId,
        });
      } else {
        user = await UsersModel.create({
          name: name || null,
          email: normalizedEmail,
          passwordHash,
          role: 'zone_leader',
          memberId,
          zoneId,
        });
      }

      return res.json({ success: true, data: toSafeUser(user) });
    } catch (err) {
      next(err);
    }
  },
  async list(req, res, next) {
    try {
      const users = await UsersModel.getAll();
      return res.json({ success: true, data: users.map(toSafeUser) });
    } catch (err) {
      next(err);
    }
  },
  async create(req, res, next) {
    try {
      const { email, password, memberId, roleId, zoneId, name } = req.body;
      if (!email || !password || !roleId) {
        return res.status(400).json({
          success: false,
          error: { message: 'email, password, and roleId are required' },
        });
      }

      const role = await RolesModel.getById(roleId);
      if (!role) {
        return res.status(404).json({ success: false, error: { message: 'Role not found' } });
      }

      const normalizedEmail = email.toLowerCase();
      const existing = await UsersModel.findByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ success: false, error: { message: 'Email already in use' } });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      const user = await UsersModel.create({
        name: name || null,
        email: normalizedEmail,
        passwordHash,
        role: role.name, // Use the role name as the string role
        roleId,
        memberId: memberId || null,
        zoneId: zoneId || null,
      });

      return res.status(201).json({ success: true, data: toSafeUser(user) });
    } catch (err) {
      next(err);
    }
  },
  async delete(req, res, next) {
    try {
      const success = await UsersModel.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleId: user.role_id,
    roleName: user.role_name,
    memberId: user.member_id,
    zoneId: user.zone_id,
    firstName: user.first_name,
    lastName: user.last_name,
    createdAt: user.created_at
  };
}

export default UsersController;
