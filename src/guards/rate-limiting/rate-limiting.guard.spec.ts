import { RateLimitingGuard } from './rate-limiting.guard';

describe('RateLimitingGuard', () => {
  it('should be defined', () => {
    expect(new RateLimitingGuard()).toBeDefined();
  });
});
