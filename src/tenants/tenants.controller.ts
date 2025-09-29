import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { TenantFilters } from './dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@GetUser() user: IGetUser, @Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto, user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  findAll(@Query() filters: TenantFilters) {
    return this.tenantsService.findAllPaginated(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const returned = await this.tenantsService.findOne(id);
    return returned
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, updateTenantDto, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.tenantsService.remove(id, user.role);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  toggleActive(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.tenantsService.toggleActive(id, user.role);
  }

  @Patch(':id/renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  renewSubscription(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() body: { plan: string },
  ) {
    return this.tenantsService.renewSubscription(id, body.plan, user.role);
  }

  @Patch(':id/customization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  updateCustomization(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() customization: {
      primaryColor?: string;
      secondaryColor?: string;
      iconColor?: string;
      logoUrl?: string;
      [key: string]: any;
    },
  ) {

    return this.tenantsService.updateCustomization(id, customization);
  }
}