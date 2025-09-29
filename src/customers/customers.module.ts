import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';

@Module({
  imports: [SequelizeModule.forFeature([Customer])],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService, SequelizeModule],
})
export class CustomersModule { }
