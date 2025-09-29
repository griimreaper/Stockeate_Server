import { Injectable, BadRequestException } from '@nestjs/common';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Cases, SendMailDto } from 'src/mailer/dto/sendMail.dto';
import { User } from 'src/users/entities/user.entity';
import { MailService } from 'src/mailer/mail.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly mailService: MailService) { }

  async updateSubscription(tenantId: string, userEmail: string, plan: 'weekly' | 'monthly' | 'annual') {
    try {
      // Validar que el tenantId existe
      const tenant = await Tenant.findByPk(tenantId);
      const user = await User.findOne({ where: { email: userEmail } });
      if (!user) {
        throw new BadRequestException(`Usuario con email ${userEmail} no encontrado`);
      }
      if (!tenant) {
        throw new BadRequestException(`Tenant con ID ${tenantId} no encontrado`);
      }

      // Validar el plan
      const validPlans = ['weekly', 'monthly', 'annual'];
      if (!validPlans.includes(plan)) {
        throw new BadRequestException(`Plan inválido: ${plan}`);
      }

      // Calcular la fecha de finalización de la suscripción
      const subscriptionEnd = this.calculateSubscriptionEndDate(plan);

      // Actualizar la suscripción del tenant
      await tenant.update({
        plan,
        subscriptionEnd,
        isActive: true, // Activar el tenant si no está activo
      });

      // Enviar email de renovación
      const sendMailDto: SendMailDto = {
        EmailAddress: user.email,
        subject: Cases.PLAN_RENOVATION,
        context: {
          name: user.name || 'Usuario',
          plan,
          subscriptionEnd: subscriptionEnd.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          dashboardUrl: process.env.NEXT_PUBLIC_API_URL + '/dashboard',
        },
      };
      await this.mailService.sendMails(sendMailDto);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      throw new BadRequestException(error.message || 'Error al actualizar la suscripción');
    }
  }

  private calculateSubscriptionEndDate(plan: string): Date {
    const now = new Date();
    if (plan === 'weekly') return new Date(now.setDate(now.getDate() + 7));
    if (plan === 'monthly') return new Date(now.setMonth(now.getMonth() + 1));
    if (plan === 'annual') return new Date(now.setFullYear(now.getFullYear() + 1));
    return now;
  }
}