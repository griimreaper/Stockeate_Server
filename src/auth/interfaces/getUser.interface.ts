import { UserRole } from "src/users/entities/user.entity";

export interface IGetUser {
  userId?: string;
  userEmail?: string;
  role?: UserRole;
  tenantId: string;
}
