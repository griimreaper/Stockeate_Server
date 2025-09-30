import { BadRequestException, HttpException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import * as jwt from 'jsonwebtoken';
import { CLIENT_URL, JWT_SECRET } from '../config/enviroments';
import { UsersService } from '../users/users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IGetUser } from './interfaces/getUser.interface';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SignupDto } from './dto/signup.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { Cases, SendMailDto } from '../mailer/dto/sendMail.dto';
import { MailService } from '../mailer/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly mailsService: MailService,
  ) { }

  // Método para hashear password (llamado desde UsersService)
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Comparar password
  async comparePassword(received: string, saved: string): Promise<boolean> {
    return bcrypt.compare(received, saved);
  }

  // Generar JWT
  async generateToken(userId: string, userEmail: string, role: UserRole): Promise<string> {
    return this.jwtService.signAsync({ userId, userEmail, role });
  }

  // Validar token
  async validateToken(token: string) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error };
    }
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name, tenantName, plan } = signupDto;
    const transaction = await User.sequelize.transaction();
    try {
      // Check if email already exists
      const existingUser = await User.findOne({ where: { email }, transaction });
      if (existingUser) {
        throw new HttpException('El correo electrónico ya está registrado', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const customization = {
        backgroundColor: "#000000",
        backgroundColor2: "#FFFFFF",
        designType: "transparent",
        gradientType: "double",
        iconColor: "#0000FF",
        logoUrl: "",
        primaryColor: "#0000FF",
        secondaryColor: "#FFFFFF",
      };


      // Create tenant con fechas
      const tenant = await Tenant.create({
        name: tenantName,
        customization,
        isActive: false,
      }, { transaction });

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: UserRole.ADMIN, // Default role for tenant owner
        tenantId: tenant.id,
        isActive: true, // Default from CreateUserDto
      }, { transaction });

      // Generate JWT token
      const payload = { sub: user.id, email: user.email, role: user.role, tenantId: tenant.id };
      const token = this.jwtService.sign(payload);

      await transaction.commit();

      //Setting up for email sending
      const mailData: SendMailDto = {
        EmailAddress: signupDto.email,
        subject: Cases.CREATE_ACCOUNT,
        context: {
          name: signupDto.name,
          tenantName: signupDto.tenantName,
          tenanId: tenant.id,
        },
      };

      //Sending mail
      await this.mailsService.sendMails(mailData);

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          customization: tenant.customization, // <- asegurate que tenga colores
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw new HttpException(error.message, error.status || 500);
    }
  }

  // Recuperar contraseña (solo usuarios existentes)
  async recoverPassword(recoverDto: RecoverPasswordDto) {
    const { email } = recoverDto;
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new NotFoundException('User not found.');

    const token = jwt.sign({ sub: user.email }, JWT_SECRET, { expiresIn: '48h' });
    const context = { name: user.name, email: recoverDto.email, link: `${CLIENT_URL}/resetPassword?token=${token}` };

    const mailData = {
      EmailAddress: user.email,
      subject: Cases.RESET_PASSWORD,
      context: context,
    };

    await this.mailsService.sendMails(mailData);

    return { message: 'Password recovery email sent successfully' };
  }

  // Reset de contraseña usando token
  async resetPassword(resetDto: ResetPasswordDto, token: string) {
    if (!token) throw new UnauthorizedException('Token is required');

    const payload: any = jwt.verify(token, JWT_SECRET);
    const user = await this.usersService.findOneByEmail(payload.sub);
    if (!user) throw new NotFoundException('User not found.');

    user.password = await this.hashPassword(resetDto.newPassword);
    await user.save();

    return { status: 200, message: 'Password reset successfully' };
  }

  // Cambio de contraseña para usuarios autenticados
  async changePassword(changeDto: ChangePasswordDto, user: IGetUser) {
    const userFind = await this.usersService.findOneByEmail(user.userEmail);
    if (!userFind) throw new NotFoundException('User not found');

    const valid = await this.comparePassword(changeDto.oldPassword, userFind.password);
    if (!valid) throw new BadRequestException('Current password does not match');

    userFind.password = await this.hashPassword(changeDto.newPassword);
    await userFind.save();

    return { status: 204, message: 'Password change was successful' };
  }

  async validateUser(email: string, password: string): Promise<{
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    tenant: {
      id: string;
      name: string;
      customization: {
        primaryColor?: string;
        secondaryColor?: string;
        iconColor?: string;
        logoUrl?: string;
        text?: string;
        background?: string;
        [key: string]: any;
      };
    };
  }> {
    try {
      const user = await this.usersService.findOneByEmail(email);
      if (!user) {
        throw new UnauthorizedException('El email no esta registrado');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
      
      const payload = { sub: user.id, role: user.role, email: user.email, tenantId: user.tenantId };
      const token = this.jwtService.sign(payload);

      console.log('', user );
      const tenant = await this.tenantsService.findOne(user.tenantId);
      if (!tenant) {
        throw new InternalServerErrorException('Tenant not found');
      }

      console.log('hola');
      
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          customization: tenant.customization,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof InternalServerErrorException) {
        throw new HttpException(error.message, error.getStatus());
      }
      throw new InternalServerErrorException('An unexpected error occurred during authentication');
    }
  }
}
