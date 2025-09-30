import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Product } from '../../products/entities/product.entity';

@Table({
  tableName: 'PurchaseItems',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class PurchaseItem extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  })
  id: string;

  @ForeignKey(() => Purchase)
  @Column({ type: DataType.UUID, allowNull: false })
  purchaseId: string;

  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  price: number;

  @BelongsTo(() => Purchase)
  purchase: Purchase;

  @BelongsTo(() => Product)
  product: Product;
}
