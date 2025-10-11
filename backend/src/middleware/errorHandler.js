export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token non valido' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token scaduto' });
  }
  
  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({ error: 'Valore duplicato' });
  }
  
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ error: 'Riferimento non valido' });
  }
  
  if (err.code === '23514') { // Check violation
    return res.status(400).json({ error: 'Vincolo di validazione fallito' });
  }
  
  // Validation errors
  if (err.isValidationError) {
    return res.status(400).json({ error: err.message });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Errore interno del server'
  });
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.isValidationError = true;
    this.status = 400;
  }
}


