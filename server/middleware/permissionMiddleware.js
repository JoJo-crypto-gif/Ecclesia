export const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    }

    const { permissions, role } = req.session.user;
    
    // Admin override: Admins can do anything regardless of permissions object status
    if (role === 'admin') return next();

    if (!permissions || Object.keys(permissions).length === 0) {
      return res.status(403).json({
        success: false,
        error: { message: 'Permissions not initialized' },
      });
    }

    if (!permissions[module] || !permissions[module][action]) {
      return res.status(403).json({
        success: false,
        error: { message: `Access denied: ${action} permission required for ${module}` },
      });
    }

    next();
  };
};
