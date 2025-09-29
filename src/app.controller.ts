import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './auth/guards/rolesGuard';
import { JwtAuthGuard } from './auth/guards/jwt-auth-guard';
import { GetUser } from './auth/decorator/auth-user.decorator';
import { IGetUser } from './auth/interfaces/getUser.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/metrics/general')
  getGeneralMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getGeneralMetrics(user.tenantId);
  }

  @Get('/metrics/products')
  getProductsMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getProductMetrics(user.tenantId);
  }

  @Get('/metrics/customers')
  getClientsMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getCustomerMetrics(user.tenantId);
  }

  @Get('/metrics/suppliers')
  getSuppliersMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getSupplierMetrics(user.tenantId);
  }

  @Get('/metrics/orders')
  getOrdersMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getOrderMetrics(user.tenantId);
  }

  @Get('/metrics/purchases')
  getPurchasesMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getPurchaseMetrics(user.tenantId);
  }

  @Get('/metrics/categories')
  getCategoriesMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getCategoryMetrics(user.tenantId);
  }
}
