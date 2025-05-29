import { UnrecoverableError } from 'bullmq';

// exceptions/token-expired.exception.ts
export class TokenExpiredException extends UnrecoverableError {
  public readonly code = 'TOKEN_EXPIRED';
  public readonly isTokenExpired = true;

  constructor(
    message: string,
    public readonly meta: { shop: string; jobId: string },
  ) {
    super(message);
  }
}
