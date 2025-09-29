import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { User } from '../../users/entities/user.entity';

@Table({
  tableName: 'Tenants',
  underscored: true,
  timestamps: true,
  paranoid: true, // elimina suave
})
export class Tenant extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4
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
  domain: string; // ejemplo: subdominio o dominio personalizado

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contactEmail: string;

  // Nuevo campo para personalización
  @Column({
    type: DataType.JSONB, // JSONB para PostgreSQL, JSON si usas MySQL
    allowNull: true,
  })
  customization: {
    primaryColor?: string;
    secondaryColor?: string;
    iconColor?: string;
    logoUrl?: string;
    [key: string]: any; // cualquier otro parámetro futuro
  };

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.STRING,
    defaultValue: 'free',
  })
  plan: string; // 'free', 'monthly', etc.

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  subscriptionStart: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  subscriptionEnd: Date;

  @HasMany(() => User)
  users: User[];
}