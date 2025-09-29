import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './entities/tenant.entity';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule { }
