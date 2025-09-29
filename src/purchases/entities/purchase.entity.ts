import { Table, Column, Model, DataType, HasMany, ForeignKey, BelongsTo, BeforeSave, BeforeUpdate, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PurchaseItem } from 'src/purchase-items/entities/purchase-item.entity';

@Table({
  tableName: 'Purchases',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class Purchase extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  })
  id: string;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tenantId: string;

  @ForeignKey(() => Supplier)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  supplierId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  date: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  total: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @BelongsTo(() => Supplier)
  supplier: Supplier;

  @HasMany(() => PurchaseItem)
  items: PurchaseItem[];

  @BeforeUpdate
  @BeforeCreate
  @BeforeSave
  static async calculateTotal(instance: Purchase) {
    if (instance.items && instance.items.length > 0) {
      const total = instance.items.reduce((acc, item) => {
        const subtotal = Number(item.price) * Number(item.quantity);
        return acc + subtotal;
      }, 0);

      instance.total = total;
    }
  }
}
