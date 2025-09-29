import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Default,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { OrderItem } from 'src/order-items/entities/order-item.entity';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from 'src/customers/entities/customer.entity';

export enum OrderStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Table({
    tableName: 'Orders',
    underscored: true,
    timestamps: true,
    paranoid: true,
})
export class Order extends Model {
    @Default(() => uuidv4())
    @Column({ type: DataType.UUID, primaryKey: true })
    id: string;

    @ForeignKey(() => Tenant)
    @Column({ type: DataType.UUID, allowNull: false })
    tenantId: string;

    @BelongsTo(() => Tenant)
    tenant: Tenant;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    userId: string | null;

    @BelongsTo(() => User)
    user: User;

    @Column({ type: DataType.ENUM(...Object.values(OrderStatus)), defaultValue: OrderStatus.PENDING })
    status: OrderStatus;

    @Column({ type: DataType.DATE, allowNull: false })
    orderDate: Date;

    @ForeignKey(() => Customer)
    @Column({ type: DataType.UUID, allowNull: false })
    customerId: string;

    @BelongsTo(() => Customer)
    customer: Customer;

    @Column({ type: DataType.FLOAT, defaultValue: 0 })
    total: number;

    @HasMany(() => OrderItem)
    items: OrderItem[];
}
