import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { Cases, SendMailDto } from './dto/sendMail.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly mailService: MailService) {}

  @Post('test-email')
  async testEmail(@Body() body: { to: string; name: string; tenantName?: string }) {
    const sendMailDto: SendMailDto = {
      EmailAddress: body.to,
      subject: Cases.CREATE_ACCOUNT,
      context: {
        name: body.name,
        tenantName: body.tenantName || 'Mi Empresa',
        tenantId: 'demo-tenant-id',
      },
    };
    console.log(sendMailDto);
    
    const response = await this.mailService.sendMails(sendMailDto);
    return response;
  }
}