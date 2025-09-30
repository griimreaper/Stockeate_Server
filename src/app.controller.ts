import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './auth/guards/rolesGuard';
import { JwtAuthGuard } from './auth/guards/jwt-auth-guard';
import { GetUser } from './auth/decorator/auth-user.decorator';
import { IGetUser } from './auth/interfaces/getUser.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/general')
  getGeneralMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getGeneralMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/products')
  getProductsMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getProductMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/customers')
  getClientsMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getCustomerMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/suppliers')
  getSuppliersMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getSupplierMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/orders')
  getOrdersMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getOrderMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/purchases')
  getPurchasesMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getPurchaseMetrics(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/metrics/categories')
  getCategoriesMetric(
    @GetUser() user: IGetUser
  ) {
    return this.appService.getCategoryMetrics(user.tenantId);
  }
}