import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cases, SendMailDto } from './dto/sendMail.dto';
import { CLIENT_URL, SERVER_URL } from 'src/config/enviroments';

export interface Response {
  message?: string;
  status: number;
}

export enum Templates {
  recoverPassword = './recoverPassword',
  createAccount = './createAccount',
  planRenovated = './planRenovated',
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) { }

  async sendMails(sendMailDto: SendMailDto): Promise<Response> {
    const { EmailAddress, subject, context } = sendMailDto;
    const bannerImageUrl = SERVER_URL + '/banner.png';
    const backgroundImageUrl = SERVER_URL + '/background.png';

    try {
      let mail;
      switch (subject) {
        case Cases.CREATE_ACCOUNT:
          mail = await this.mailerService.sendMail({
            to: EmailAddress,
            subject: '¡Cuenta creada exitosamente en Stockeate!',
            template: Templates.createAccount,
            context: {
              ...context,
            },
            attachments: [
              {
                filename: 'banner.png',
                path: bannerImageUrl,
                cid: 'headerStockeateLogo',
              },
              {
                filename: 'background.png',
                path: backgroundImageUrl,
                cid: 'backgroundStockeate',
              },
            ],
          });
          break;
        case Cases.RESET_PASSWORD:
          mail = await this.mailerService.sendMail({
            to: EmailAddress,
            subject: 'Recuperación de contraseña solicitada para Stockeate',
            template: Templates.recoverPassword,
            context: {
              ...context,
              resetUrl: context.resetUrl || SERVER_URL + '/reset-password',
            },
            attachments: [
              {
                filename: 'banner.png',
                path: bannerImageUrl,
                cid: 'headerStockeateLogo',
              },
              {
                filename: 'background.png',
                path: backgroundImageUrl,
                cid: 'backgroundStockeate',
              },
            ],
          });
          break;
        case Cases.PLAN_RENOVATION:
          mail = await this.mailerService.sendMail({
            to: EmailAddress,
            subject: 'Renovacion de plan obtenida para Stockeate',
            template: Templates.planRenovated,
            context: {
              ...context,
            },
            attachments: [
              {
                filename: 'banner.png',
                path: bannerImageUrl,
                cid: 'headerStockeateLogo',
              },
              {
                filename: 'background.png',
                path: backgroundImageUrl,
                cid: 'backgroundStockeate',
              },
            ],
          });
          break;
      }
      //If mail.accepted: [ user_email ]
      if (mail && mail.accepted && mail.accepted.length) {
        return {
          status: 200,
          message: 'The link to recover the password has been sent',
        };
      } else {
        throw new InternalServerErrorException(
          'Error sending recovery email',
        );
      }
    } catch (error) {
      console.log(error);
    }
  }
}
