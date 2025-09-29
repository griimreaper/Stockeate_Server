import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UsersModule } from 'src/users/users.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from 'src/users/entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantsService } from 'src/tenants/tenants.service';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { MailService } from 'src/mailer/mail.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // carga las variables de entorno
    forwardRef(() => UsersModule),
    SequelizeModule.forFeature([User, Tenant]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, TenantsService, MailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
