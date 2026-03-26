import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :identifier OR user.username = :identifier', { identifier })
      .getOne();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ username });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ verificationToken: token });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ id });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.usersRepo.update(id, { emailVerified: true, verificationToken: null });
  }

  async updateVerificationToken(id: string, token: string): Promise<void> {
    await this.usersRepo.update(id, { verificationToken: token });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ resetPasswordToken: token });
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.usersRepo.update(id, { resetPasswordToken: token, resetPasswordExpiry: expiry });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepo.update(id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    });
  }
}
