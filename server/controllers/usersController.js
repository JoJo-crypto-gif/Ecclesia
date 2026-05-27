import bcrypt from 'bcrypt';
import UsersModel from '../models/usersModel.js';
import MembersModel from '../models/membersModel.js';
import RolesModel from '../models/rolesModel.js';
import AuditService from '../services/auditService.js';

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
      await UsersModel.update(user.id, {
        passwordHash,
        temporaryPasswordHash: null,
        temporaryPasswordExpiresAt: null,
        passwordResetRequestedAt: null,
        mustChangePassword: false,
      });

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
      const { name, email, mfaEnabled } = req.body;
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

      const updatedUser = await UsersModel.update(sessionUser.id, { 
        name, 
        email: normalizedEmail,
        mfaEnabled: mfaEnabled !== undefined ? Boolean(mfaEnabled) : sessionUser.mfaEnabled
      });
      
      req.session.user = {
        ...sessionUser,
        name: updatedUser.name,
        email: updatedUser.email,
        mfaEnabled: updatedUser.mfa_enabled
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

      const zoneLeaderRole = await RolesModel.getByName('zone_leader');
      const roleId = zoneLeaderRole ? zoneLeaderRole.id : null;

      let user;
      if (existingByMember) {
        user = await UsersModel.update(existingByMember.id, {
          name: name || existingByMember.name,
          email: normalizedEmail,
          passwordHash,
          role: 'zone_leader',
          roleId,
          memberId,
          zoneId,
        });
      } else if (existingByEmail) {
        user = await UsersModel.update(existingByEmail.id, {
          name: name || existingByEmail.name,
          passwordHash,
          role: 'zone_leader',
          roleId,
          memberId,
          zoneId,
        });
      } else {
        user = await UsersModel.create({
          name: name || null,
          email: normalizedEmail,
          passwordHash,
          role: 'zone_leader',
          roleId,
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

      const sessionUser = req.session?.user;
      AuditService.log({
        req,
        user: sessionUser,
        action: 'CREATE',
        module: 'users',
        recordId: user.id,
        recordName: user.name || user.email,
        description: `Created system user ${user.name || user.email} with role ${role.name}`,
        changes: AuditService.computeChanges({}, toSafeUser(user))
      });

      return res.status(201).json({ success: true, data: toSafeUser(user) });
    } catch (err) {
      next(err);
    }
  },
  async delete(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const existing = await UsersModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      const success = await UsersModel.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      AuditService.log({
        req,
        user: sessionUser,
        action: 'DELETE',
        module: 'users',
        recordId: existing.id,
        recordName: existing.name || existing.email,
        description: `Deleted system user ${existing.name || existing.email}`,
        changes: AuditService.computeChanges(toSafeUser(existing), {})
      });
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
  async updateUser(req, res, next) {
    try {
      const sessionUser = req.session?.user;
      const existing = await UsersModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      const { mfaEnabled } = req.body;
      const updated = await UsersModel.update(req.params.id, {
        mfaEnabled: mfaEnabled !== undefined ? Boolean(mfaEnabled) : undefined
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }
      const changes = AuditService.computeChanges(toSafeUser(existing), toSafeUser(updated));
      if (Object.keys(changes).length > 0) {
        AuditService.log({
          req,
          user: sessionUser,
          action: 'UPDATE',
          module: 'users',
          recordId: updated.id,
          recordName: updated.name || updated.email,
          description: `Updated system user ${updated.name || updated.email}`,
          changes
        });
      }
      return res.json({ success: true, data: toSafeUser(updated) });
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
    createdAt: user.created_at,
    mfaEnabled: user.mfa_enabled,
    mustChangePassword: Boolean(user.must_change_password)
  };
}

export default UsersController;
