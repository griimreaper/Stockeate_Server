import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @IsEnum(['weekly', 'monthly', 'annual'])
  plan: 'weekly' | 'monthly' | 'annual';
}