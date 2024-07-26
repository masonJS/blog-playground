class BaseError extends Error {
  constructor(message) {
    super(message);
    if (Error.captureStackTrace) {
      Erro.captureStackTrace(this, this.constructor)
    }
  }
}

class DomainError extends BaseError {
  #statusCode;

  constructor(message, statusCode) {
    super(message);
    this.#statusCode = statusCode;
  }

  static NotFound({ message }) {
    return new DomainError(message || '접근 권한이 없거나 삭제되었습니다.', 404);
  }

  static BadRequest({ message }) {
    return new DomainError(message, 400);
  }

}
