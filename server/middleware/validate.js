/**
 * Create a validation middleware for required fields.
 * @param {string[]} requiredFields - List of field names that must be present in req.body
 * @returns Express middleware function
 */
export function requireFields(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required fields: ${missing.join(', ')}`,
          fields: missing,
        },
      });
    }

    next();
  };
}

/**
 * Validate email format.
 */
export function validateEmail(req, res, next) {
  const { email } = req.body;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid email format',
        fields: ['email'],
      },
    });
  }
  next();
}
