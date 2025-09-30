import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  Default,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
} from 'sequelize-typescript';
import { Product } from '../../products/entities/product.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { v4 as uuidv4 } from 'uuid';
import { CategoryProduct } from './categoryProducts.entity';

@Table({
  tableName: 'Categories',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class Category extends Model {
  @Default(() => uuidv4())
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  // Relación con Tenant
  @ForeignKey(() => Tenant)
  @Column({ type: DataType.UUID, allowNull: false })
  tenantId: string;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @BelongsToMany(() => Product, () => CategoryProduct)
  products: Product[];
}
