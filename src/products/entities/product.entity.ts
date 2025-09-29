import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
    HasMany,
    Default,
    BelongsToMany,
    BeforeUpdate,
    BeforeCreate,
} from 'sequelize-typescript';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { OrderItem } from 'src/order-items/entities/order-item.entity';
import { v4 as uuidv4 } from 'uuid';
import { Category } from 'src/categories/entities/category.entity';
import { CategoryProduct } from 'src/categories/entities/categoryProducts.entity';
import { PurchaseItem } from 'src/purchase-items/entities/purchase-item.entity';

export enum ProductStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    OUT_OF_STOCK = 'out_of_stock',
}

@Table({
    tableName: 'Products',
    underscored: true,
    timestamps: true,
    paranoid: true,
})
export class Product extends Model {
    @Default(() => uuidv4())
    @Column({ type: DataType.UUID, primaryKey: true })
    id: string;

    @ForeignKey(() => Tenant)
    @Column({ type: DataType.UUID, allowNull: false })
    tenantId: string;

    @BelongsTo(() => Tenant)
    tenant: Tenant;

    @Column({ type: DataType.STRING, allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description: string;

    @Column({ type: DataType.FLOAT, allowNull: false })
    price: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    stock: number;

    @Column({ type: DataType.STRING, allowNull: true })
    sku: string;

    @Column({ type: DataType.STRING, allowNull: true })
    URL: string;

    @Column({
        type: DataType.ENUM(...Object.values(ProductStatus)),
        defaultValue: ProductStatus.ACTIVE,
    })
    status: ProductStatus;

    @HasMany(() => OrderItem)
    orderItems: OrderItem[];

    @HasMany(() => PurchaseItem)
    purchaseItems: PurchaseItem[];

    @BelongsToMany(() => Category, () => CategoryProduct)
    categories: Category[];

    @BeforeCreate
    @BeforeUpdate
    static beforeCreateHook(instance: Product) {
        if (instance.stock <= 0 && instance.status !== ProductStatus.INACTIVE) {
            instance.status = ProductStatus.OUT_OF_STOCK;
            console.log(`Producto ${instance.name} creado con OUT_OF_STOCK (stock: ${instance.stock})`);
        } else if (instance.stock > 0 && instance.status !== ProductStatus.INACTIVE) {
            instance.status = ProductStatus.ACTIVE;
            console.log(`Producto ${instance.name} creado con ACTIVE (stock: ${instance.stock})`);
        }
    }
}