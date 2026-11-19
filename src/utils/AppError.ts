export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code = "REQUEST_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = "VALIDATION_ERROR", details?: unknown): AppError {
    return new AppError(400, message, code, details);
  }

  static unauthorized(message: string, code = "UNAUTHORIZED"): AppError {
    return new AppError(401, message, code);
  }

  static forbidden(message: string, code = "FORBIDDEN"): AppError {
    return new AppError(403, message, code);
  }

  static notFound(message: string, code = "NOT_FOUND"): AppError {
    return new AppError(404, message, code);
  }

  static conflict(message: string, code = "CONFLICT"): AppError {
    return new AppError(409, message, code);
  }
}
