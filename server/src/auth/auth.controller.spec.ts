import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  verifyEmail: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('register() delegates to authService.register and returns its result', async () => {
    const dto = { email: 'a@b.com', username: 'alice', password: 'pass1234' };
    const expected = { message: 'Account created!' };
    mockAuthService.register.mockResolvedValueOnce(expected);

    const result = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('login() delegates to authService.login and returns its result', async () => {
    const dto = { identifier: 'alice', password: 'pass1234' };
    const expected = { access_token: 'jwt', user: { id: '1' } };
    mockAuthService.login.mockResolvedValueOnce(expected);

    const result = await controller.login(dto);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('verifyEmail() passes the token query param to authService.verifyEmail', async () => {
    const expected = { message: 'Email verified!' };
    mockAuthService.verifyEmail.mockResolvedValueOnce(expected);

    const result = await controller.verifyEmail('my-token');
    expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('my-token');
    expect(result).toBe(expected);
  });

  it('forgotPassword() delegates to authService.forgotPassword', async () => {
    const dto = { email: 'a@b.com' };
    const expected = { message: "If an account..." };
    mockAuthService.forgotPassword.mockResolvedValueOnce(expected);

    const result = await controller.forgotPassword(dto);
    expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('resetPassword() delegates to authService.resetPassword', async () => {
    const dto = { token: 'tok', password: 'NewPass1!' };
    const expected = { message: 'Password reset successfully.' };
    mockAuthService.resetPassword.mockResolvedValueOnce(expected);

    const result = await controller.resetPassword(dto);
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });
});
