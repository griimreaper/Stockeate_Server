import { IsNotEmpty, IsUUID } from "class-validator";
import { SheetsPurchaseDto } from "./sheetPurchase.dto";

export class SheetsPurchaseUpdateDto extends SheetsPurchaseDto {
  @IsNotEmpty()
  @IsUUID()
  ID: string; // En actualización el ID es obligatorio
}