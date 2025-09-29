import { IsNotEmpty, IsUUID } from "class-validator";
import { SheetsCategoryDto } from "./sheetCategory.dto";

export class SheetsCategoryUpdateDto extends SheetsCategoryDto {
  @IsNotEmpty()
  @IsUUID()
  ID: string; // En actualización el ID es obligatorio
}