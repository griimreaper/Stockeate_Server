import {
  Controller,
  Patch,
  Body,
  HttpCode,
  UseGuards,
  Headers,
  Get,
  Param,
  Post,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from './decorator/auth-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { IGetUser } from './interfaces/getUser.interface';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from 'src/users/dto/login-user.dto';
import { log } from 'console';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // Recuperación de contraseña
  @Patch('recoverPassword')
  @HttpCode(201)
  async recoverPassword(@Body() recoverPassword: RecoverPasswordDto) {
    return this.authService.recoverPassword(recoverPassword);
  }

  // Login

  @Post('signup')
  @HttpCode(201)
  async signup(@Body() signupDto: SignupDto) {
    const response = await this.authService.signup(signupDto);

    console.log(response);
    return response;
  }

  @Post('login')
  async login(@Body(ValidationPipe) body: LoginDto) {
    return this.authService.validateUser(body.email, body.password);
  }

  @Patch('resetPassword')
  @HttpCode(201)
  async resetPassword(
    @Body() resetPassword: ResetPasswordDto,
    @Headers('x-token') token: string,
  ) {
    return this.authService.resetPassword(resetPassword, token);
  }

  // Cambio de contraseña para usuarios autenticados
  @UseGuards(JwtAuthGuard)
  @Patch('changePassword')
  @HttpCode(201)
  async changePassword(
    @Body() changePassword: ChangePasswordDto,
    @GetUser() user: IGetUser,
  ) {
    return this.authService.changePassword(changePassword, user);
  }

  // Validación de token de recuperación
  @Get('token/:token')
  @HttpCode(201)
  async validateToken(@Param('token') token: string) {
    return this.authService.validateToken(token);
  }
}
