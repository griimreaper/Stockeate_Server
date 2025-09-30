import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { join } from 'path';
import { transporter } from '../config/mailer';
import { ContactController } from './mail.controller';

@Module({
  imports: [MailerModule.forRoot({
    transport: transporter,
    defaults: {
      from: 'servicioalcliente@stockeate.com',
    },
    template: {
      dir: join(__dirname, './templates'),
      adapter: new PugAdapter(),
      options: {
        sticts: true,
      },
    },
  }),
  ],
  controllers: [ContactController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}