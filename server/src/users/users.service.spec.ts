import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

function makeQb(result: unknown = null) {
  const qb: any = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

const mockRepo = {
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmailOrUsername()', () => {
    it('uses createQueryBuilder with addSelect(password) and WHERE email OR username', async () => {
      const fakeUser = { id: '1', email: 'a@b.com', username: 'alice' };
      const qb = makeQb(fakeUser);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findByEmailOrUsername('alice');
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
      expect(result).toBe(fakeUser);
    });
  });

  describe('findByUsername()', () => {
    it('calls findOneBy with the username', async () => {
      const fakeUser = { id: '1', username: 'alice' };
      mockRepo.findOneBy.mockResolvedValueOnce(fakeUser);

      const result = await service.findByUsername('alice');
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ username: 'alice' });
      expect(result).toBe(fakeUser);
    });
  });

  describe('findByEmail()', () => {
    it('uses createQueryBuilder with addSelect(password) and WHERE email', async () => {
      const fakeUser = { id: '1', email: 'a@b.com' };
      const qb = makeQb(fakeUser);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findByEmail('a@b.com');
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qb.addSelect).toHaveBeenCalledWith('user.password');
      expect(result).toBe(fakeUser);
    });
  });

  describe('findByVerificationToken()', () => {
    it('calls findOneBy with verificationToken', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce({ id: '1' });
      await service.findByVerificationToken('tok123');
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ verificationToken: 'tok123' });
    });

    it('returns null when token is not found', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(null);
      const result = await service.findByVerificationToken('bad-token');
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('calls findOneBy with the id', async () => {
      const fakeUser = { id: 'uuid-1' };
      mockRepo.findOneBy.mockResolvedValueOnce(fakeUser);

      const result = await service.findById('uuid-1');
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
      expect(result).toBe(fakeUser);
    });
  });

  describe('create()', () => {
    it('calls repo.create then repo.save and returns the saved user', async () => {
      const data = { email: 'new@example.com', username: 'new' };
      const created = { ...data, id: 'new-uuid' };
      const saved = { ...created };
      mockRepo.create.mockReturnValueOnce(created);
      mockRepo.save.mockResolvedValueOnce(saved);

      const result = await service.create(data);
      expect(mockRepo.create).toHaveBeenCalledWith(data);
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(saved);
    });
  });

  describe('markEmailVerified()', () => {
    it('updates emailVerified to true and clears verificationToken', async () => {
      mockRepo.update.mockResolvedValueOnce(undefined);
      await service.markEmailVerified('user-uuid');
      expect(mockRepo.update).toHaveBeenCalledWith('user-uuid', {
        emailVerified: true,
        verificationToken: null,
      });
    });
  });

  describe('updateVerificationToken()', () => {
    it('updates only the verificationToken field', async () => {
      mockRepo.update.mockResolvedValueOnce(undefined);
      await service.updateVerificationToken('user-uuid', 'new-token');
      expect(mockRepo.update).toHaveBeenCalledWith('user-uuid', { verificationToken: 'new-token' });
    });
  });

  describe('findByResetToken()', () => {
    it('calls findOneBy with resetPasswordToken', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce({ id: '1' });
      await service.findByResetToken('reset-tok');
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ resetPasswordToken: 'reset-tok' });
    });
  });

  describe('setResetToken()', () => {
    it('updates resetPasswordToken and resetPasswordExpiry', async () => {
      mockRepo.update.mockResolvedValueOnce(undefined);
      const expiry = new Date(Date.now() + 3600000);
      await service.setResetToken('user-uuid', 'tok', expiry);
      expect(mockRepo.update).toHaveBeenCalledWith('user-uuid', {
        resetPasswordToken: 'tok',
        resetPasswordExpiry: expiry,
      });
    });
  });

  describe('updatePassword()', () => {
    it('updates password and clears both reset token fields', async () => {
      mockRepo.update.mockResolvedValueOnce(undefined);
      await service.updatePassword('user-uuid', 'hashed-pw');
      expect(mockRepo.update).toHaveBeenCalledWith('user-uuid', {
        password: 'hashed-pw',
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      });
    });
  });
});
