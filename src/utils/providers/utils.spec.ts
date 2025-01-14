import { Test, TestingModule } from '@nestjs/testing';
import { UtilsService } from './utils.service';

describe('Utils', () => {
  let provider: UtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UtilsService],
    }).compile();

    provider = module.get<UtilsService>(UtilsService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
