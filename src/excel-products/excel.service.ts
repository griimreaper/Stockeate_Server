import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { API_KEY } from '../config/enviroments';
import { SheetsProductsDto } from './dto/sheetProduct.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CategoriesService } from '../categories/categories.service';
import { SheetsProductsUpdateDto } from './dto/sheetProductUpdate.dto';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import { SheetsCustomerUpdateDto } from './dto/sheetCustomerUpdate.dto';
import { SheetsCustomerDto } from './dto/sheetCustomer.dto';
import { SuppliersService } from '../suppliers/suppliers.service';
import { SheetsSupplierDto } from './dto/sheetSupplier.dto';
import { SheetsSupplierUpdateDto } from './dto/sheetSupplierUpdate.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { OrdersService } from '../orders/orders.service';
import { Category } from '../categories/entities/category.entity';
import { Order } from '../orders/entities/order.entity';
import { SheetsCategoryDto } from './dto/sheetCategory.dto';
import { SheetsCategoryUpdateDto } from './dto/sheetCategoryUpdate.dto';
import { SheetsOrderDto } from './dto/sheetOrder.dto';
import { SheetsOrderUpdateDto } from './dto/sheetOrderUpdate';
import { SheetsPurchaseDto } from './dto/sheetPurchase.dto';
import { SheetsPurchaseUpdateDto } from './dto/sheetPurchaseUpdate.dto';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PurchasesService } from '../purchases/purchases.service';

@Injectable()
export class ExcelService {
    constructor(
        private readonly productService: ProductsService,
        private readonly customersService: CustomersService,
        private readonly suppliersService: SuppliersService,
        private readonly categoriesService: CategoriesService,
        private readonly ordersService: OrdersService,
        private readonly purchasesService: PurchasesService,
    ) { }

    // --- Mapeo de entidades ---
    private entityMap = {
        product: {
            dtoImport: SheetsProductsDto,
            dtoUpdate: SheetsProductsUpdateDto,
            model: Product,
            import: this.productService.importProductsFromExcel.bind(this),
            update: this.productService.updateProductsFromExcel.bind(this),
            export: this.productService.getExportProducts.bind(this),
            exportExcel: this.productService.exportProductsToExcel.bind(this),
            example: this.productService.generateExampleImportExcelWithReference.bind(this),
        },
        customer: {
            dtoImport: SheetsCustomerDto,
            dtoUpdate: SheetsCustomerUpdateDto,
            model: Customer,
            import: this.customersService.importCustomersFromExcel.bind(this),
            update: this.customersService.updateCustomersFromExcel.bind(this),
            export: this.customersService.getExportCustomers.bind(this),
            exportExcel: this.customersService.exportCustomersToExcel.bind(this),
            example: this.customersService.generateExampleCustomerExcel.bind(this),
        },
        supplier: {  // <-- agregado para Suppliers
            dtoImport: SheetsSupplierDto,
            dtoUpdate: SheetsSupplierUpdateDto,
            model: Supplier,
            import: this.suppliersService.importSuppliersFromExcel.bind(this),
            update: this.suppliersService.updateSuppliersFromExcel.bind(this),
            export: this.suppliersService.getExportSuppliers.bind(this),
            exportExcel: this.suppliersService.exportSuppliersToExcel.bind(this),
            example: this.suppliersService.generateExampleSupplierExcel.bind(this),
        },
        categories: {
            dtoImport: SheetsCategoryDto,
            dtoUpdate: SheetsCategoryUpdateDto,
            model: Category,
            import: this.categoriesService.importCategoriesFromExcel.bind(this),
            update: this.categoriesService.updateCategoriesFromExcel.bind(this),
            export: this.categoriesService.getExportCategories.bind(this),
            exportExcel: this.categoriesService.exportCategoriesToExcel.bind(this),
            example: this.categoriesService.generateExampleCategoryExcel.bind(this),
        },
        orders: {
            dtoImport: SheetsOrderDto,
            dtoUpdate: SheetsOrderUpdateDto,
            model: Order,
            import: this.ordersService.importOrdersFromExcel.bind(this),
            update: this.ordersService.updateOrdersFromExcel.bind(this),
            export: this.ordersService.getExportOrders.bind(this),
            exportExcel: this.ordersService.exportOrdersToExcel.bind(this),
            example: this.ordersService.generateExampleOrderExcel.bind(this),
        },
        purchases: {
            dtoImport: SheetsPurchaseDto,
            dtoUpdate: SheetsPurchaseUpdateDto,
            model: Purchase,
            import: this.purchasesService.importPurchasesFromExcel.bind(this),
            update: this.purchasesService.updatePurchasesFromExcel.bind(this),
            export: this.purchasesService.getExportPurchases.bind(this),
            exportExcel: this.purchasesService.exportPurchasesToExcel.bind(this),
            example: this.purchasesService.generateExamplePurchaseExcel.bind(this),
        },
    };

    private getEntityMethods(entity: string) {
        const key = entity.toLowerCase();
        const methods = this.entityMap[key];
        if (!methods) throw new BadRequestException(`Entidad "${entity}" no registrada para Excel.`);
        return methods;
    }

    async getSheetsData(url: string) {
        try {
            const sheetsId = url.split('/')[5];
            const doc = new GoogleSpreadsheet(sheetsId);

            // Para hojas públicas
            await doc.useApiKey(API_KEY);

            await doc.loadInfo(); // carga info de todas las hojas

            return doc;
        } catch (error) {
            throw new Error(`Error al cargar la hoja: ${error.message}`);
        }
    }

    async spreadSheetsToJSON(Data: GoogleSpreadsheet): Promise<any[]> {
        try {
            const miSheets = Data.sheetsByIndex[0];

            const rowValues = await miSheets.getCellsInRange('A:W');
            const headers = rowValues[0];
            const objectContainer = [];

            for (const val of Object(rowValues.slice(1))) {
                const object: any = {};
                headers.forEach((header: string, index: number) => {
                    object[header] = val[index] !== '' && val[index] !== undefined ? val[index] : null;
                });

                objectContainer.push(object);
            }

            return objectContainer;
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    async validateProduct<T extends object>(data: any, dtoClass: new () => T): Promise<T> {
        // Convertimos el objeto plano en una instancia del DTO
        const productInstance = plainToInstance(dtoClass, data);

        // Ejecutamos la validación
        const errors = await validate(productInstance);

        if (errors.length > 0) {
            const errorMessages = errors.map(error => {
                const constraints = Object.values(error.constraints || {}).join(', ');
                return `${error.property}: ${constraints}`;
            });

            throw new HttpException(
                `Validation Errors ${productInstance['ID'] || ''}: \n ${errorMessages.join(' \n ')}`,
                402
            );
        }

        return productInstance;
    }

    async processExcel(
        tenantId: string,
        entity: string,
        data: any[],
        mode: 'import' | 'update'
    ) {
        const methods = this.getEntityMethods(entity);

        // Elegimos el DTO correcto según el modo
        const dtoClass = mode === 'import' ? methods.dtoImport : methods.dtoUpdate;

        // Validación
        for (const row of data) {
            await this.validateProduct(row, dtoClass);
        }

        if (mode === 'import') return await methods.import(tenantId, data);
        if (mode === 'update') return await methods.update(tenantId, data);

        throw new BadRequestException(`Modo "${mode}" no soportado.`);
    }

    async exportEntity(entity: string) {
        const methods = this.getEntityMethods(entity);
        const data = await methods.export();
        return methods.exportExcel(data);
    }

    async generateExample(entity: string) {
        const methods = this.getEntityMethods(entity);
        return methods.example();
    }

    capitalizeTitle(text: string): string {
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
