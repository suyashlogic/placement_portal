// Creates an Error that carries an HTTP status. The central error handler reads err.statusCode.
export const httpError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });
