import { Test, TestingModule } from '@nestjs/testing';
import { ShopifyAuthService } from './shopify-auth.service';

describe('InstallationService', () => {
  let service: ShopifyAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopifyAuthService],
    }).compile();

    service = module.get<ShopifyAuthService>(ShopifyAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
