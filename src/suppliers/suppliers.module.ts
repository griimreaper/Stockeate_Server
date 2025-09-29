import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { Supplier } from './entities/supplier.entity';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([Supplier])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SequelizeModule, SuppliersService]
})
export class SuppliersModule { }
