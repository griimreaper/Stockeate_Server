import { Table, Column, Model, DataType, HasMany, Index } from 'sequelize-typescript';
import { Order } from '../../orders/entities/order.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'Customers',
  timestamps: true,
  paranoid: true,
  underscored: true,
})
export class Customer extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  })
  id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tenantId: string; // 👈 campo multi-tenant

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  city?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country?: string;

  @HasMany(() => Order)
  orders: Order[];
}
