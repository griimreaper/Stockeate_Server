import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get('success')
    @Redirect()
    async handleSuccess(
        @Query('tenantId') tenantId: string,
        @Query('userEmail') userEmail: string,
        @Query('plan') plan: 'weekly' | 'monthly' | 'annual',
    ) {
        // Actualizar la suscripción del tenant
        await this.paymentsService.updateSubscription(tenantId, userEmail, plan);

        // Redirigir al dashboard del tenant
        const redirectUrl = `${process.env.CLIENT_URL}/${tenantId}/dashboard`;
        return { url: redirectUrl, statusCode: 302 };
    }
}