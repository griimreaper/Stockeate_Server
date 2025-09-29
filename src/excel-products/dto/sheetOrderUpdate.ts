import { IsNotEmpty, IsUUID } from "class-validator";
import { SheetsOrderDto } from "./sheetOrder.dto";

export class SheetsOrderUpdateDto extends SheetsOrderDto {
  @IsNotEmpty()
  @IsUUID()
  ID: string; // En actualización el ID es obligatorio
}