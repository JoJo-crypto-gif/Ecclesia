export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
  }
  return next();
}

export function requireRole(roles = []) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      });
    }
    return next();
  };
}

export function requireCompletedPasswordReset(req, res, next) {
  const user = req.session?.user;
  if (user?.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: { message: 'Password change required before continuing' },
      mustChangePassword: true,
    });
  }
  return next();
}
