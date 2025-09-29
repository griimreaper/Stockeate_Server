import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Purchase } from 'src/purchases/entities/purchase.entity';

@Table({
  tableName: 'Suppliers',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class Supplier extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: () => uuidv4(),
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  email?: string;

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
  address?: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  tenantId: string;

  // 🔗 Un proveedor puede tener varias compras
  @HasMany(() => Purchase)
  purchases: Purchase[];
}
