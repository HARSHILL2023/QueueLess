const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const data = req[source];
      const parsed = await schema.parseAsync(data);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.issues) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details,
        });
      }
      return res.status(400).json({ error: error.message || 'Invalid input data' });
    }
  };
};

module.exports = validate;
