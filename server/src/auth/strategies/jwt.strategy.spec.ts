import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

const mockUsersService = {
  findById: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate()', () => {
    const payload = { sub: 'user-uuid', email: 'user@example.com' };

    it('throws UnauthorizedException when user is not found', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null);
      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns the user object when found', async () => {
      const fakeUser = { id: 'user-uuid', email: 'user@example.com', role: 'user' };
      mockUsersService.findById.mockResolvedValueOnce(fakeUser);

      const result = await strategy.validate(payload);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid');
      expect(result).toBe(fakeUser);
    });
  });
});
