
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate entry. This record already exists.',
      error: 'Validation Error',
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      message: 'Record not found',
      error: 'Not Found',
    })
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      error: 'Validation Error',
      errors: err.errors,
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      error: 'Unauthorized',
    })
  }

  // Default error
  const status = err.statusCode || err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    status: 'error',
    message,
    error: err.name || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

