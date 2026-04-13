import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

function makeContext(user: unknown, handler = jest.fn(), classRef = jest.fn()): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('returns true when no roles metadata is set (open route)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(undefined);
    const ctx = makeContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when roles metadata is an empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([]);
    const ctx = makeContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when the user role is in the required roles list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = makeContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns false when the user role is not in the required roles list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = makeContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('returns false when user is undefined on the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('returns true when moderator role is in [ADMIN, MODERATOR] list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN, UserRole.MODERATOR]);
    const ctx = makeContext({ role: UserRole.MODERATOR });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns false when moderator role is not in [ADMIN]-only list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = makeContext({ role: UserRole.MODERATOR });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('returns true when admin role is in [ADMIN, MODERATOR] list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN, UserRole.MODERATOR]);
    const ctx = makeContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns false when a regular user tries to access a moderator/admin route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce([UserRole.ADMIN, UserRole.MODERATOR]);
    const ctx = makeContext({ role: UserRole.USER });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
