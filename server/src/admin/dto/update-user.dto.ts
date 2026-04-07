import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  @IsString()
  suspendReason?: string;
}
