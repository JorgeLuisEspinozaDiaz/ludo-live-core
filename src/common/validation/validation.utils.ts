import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer/types/interfaces';

export async function validateDto<T>(
  dto: T | T[], // DTO o array de DTOs
  DtoClass: ClassConstructor<T>, // Clase del DTO (usando ClassConstructor de class-transformer)
): Promise<void> {
  let errors: string[] = [];

  if (Array.isArray(dto)) {
    // Validar cada elemento del array
    for (const item of dto) {
      const dtoInstance = plainToInstance(DtoClass, item); // Convertir a instancia de la clase DTO
      const validationErrors = await validate(dtoInstance as object); // Validar
      if (validationErrors.length > 0) {
        errors = errors.concat(extractErrorMessages(validationErrors)); // Extraer mensajes de error
      }
    }
  } else {
    // Validar el objeto individual
    const dtoInstance = plainToInstance(DtoClass, dto); // Convertir a instancia de la clase DTO
    const validationErrors = await validate(dtoInstance as object); // Validar
    if (validationErrors.length > 0) {
      errors = errors.concat(extractErrorMessages(validationErrors)); // Extraer mensajes de error
    }
  }

  // Si hay errores, lanzar una excepción con los mensajes
  if (errors.length > 0) {
    throw new BadRequestException({
      message: errors,
      error: 'Bad Request',
      statusCode: 400,
    });
  }
}

// Función para extraer mensajes de error de las restricciones
function extractErrorMessages(errors: any[]): string[] {
  return errors.flatMap((error) => {
    return Object.values(error.constraints); // Extraer los mensajes de las restricciones
  });
}