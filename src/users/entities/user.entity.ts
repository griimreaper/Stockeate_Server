import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Order } from '../../orders/entities/order.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum UserRole {
  SUPERADMIN = 'superadmin', // puede gestionar todos los tenants y usuarios
  ADMIN = 'admin',           // puede gestionar usuarios y operaciones dentro de su tenant
  SUPERVISOR = 'supervisor', // puede supervisar operaciones dentro del tenant, sin permisos de creación de usuarios
  CASHIER = 'cashier',       // acceso limitado a ventas y stock, sin permisos de administración
}

export enum UserProviders {
  none = 'none',
  google = 'google',
  facebook = 'facebook',
}

@Table({
  tableName: 'Users',
  timestamps: true,
  underscored: true,
  paranoid: true,
})
export class User extends Model<User> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: true, // <-- antes era false
  })
  tenantId: string;

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
    allowNull: false,
  })
  password: string; // El hash se hace en el servicio de auth

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.CASHIER,
  })
  role: UserRole;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  // Relación con órdenes
  @HasMany(() => Order)
  orders: Order[];
}
