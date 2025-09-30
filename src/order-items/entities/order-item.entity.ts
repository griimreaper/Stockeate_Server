import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Default,
} from 'sequelize-typescript';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'OrderItems',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class OrderItem extends Model {
  @Default(() => uuidv4())
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @ForeignKey(() => Order)
  @Column({ type: DataType.UUID, allowNull: false })
  orderId: string;

  @BelongsTo(() => Order)
  order: Order;

  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID, allowNull: false })
  productId: string;

  @BelongsTo(() => Product)
  product: Product;

  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;

  @Column({ type: DataType.FLOAT, allowNull: false })
  price: number; // precio unitario al momento de la orden
}
