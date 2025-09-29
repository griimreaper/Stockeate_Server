export class OrderItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  category?: {
    id: string;
    name: string;
  };
}

export class OrderResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemResponseDto[];
}
