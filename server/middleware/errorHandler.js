/**
 * Centralized error handler middleware.
 * Catches errors thrown from route handlers and sends a consistent JSON response.
 */
export default function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const rawMessage = err.message || 'Internal Server Error';
  const isProd = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProd ? 'Internal Server Error' : rawMessage;

  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message,
      statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
