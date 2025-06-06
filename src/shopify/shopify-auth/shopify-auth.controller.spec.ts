import { Test, TestingModule } from '@nestjs/testing';
import { ShopifyAuthController } from './shopify-auth.controller';

describe('InstallationController', () => {
  let controller: ShopifyAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopifyAuthController],
    }).compile();

    controller = module.get<ShopifyAuthController>(ShopifyAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
