import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';
import { Product } from '../../products/entities/product.entity';
import { Category } from './category.entity';

@Table({ tableName: 'CategoryProducts', timestamps: false, underscored: true })
export class CategoryProduct extends Model {
  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID })
  categoryId: string;

  @ForeignKey(() => Product)
  @Column({ type: DataType.UUID })
  productId: string;
}
