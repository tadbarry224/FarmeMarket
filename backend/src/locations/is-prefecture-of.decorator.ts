import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isPrefectureOfRegion } from './guinea-locations';

// Vérifie que la préfecture appartient à la région indiquée dans le champ `regionField` du même DTO.
// Exemple : @IsPrefectureOf('region') prefecture: string;
export function IsPrefectureOf(
  regionField: string,
  validationOptions?: ValidationOptions,
) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isPrefectureOf',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown, args) => {
          const dto = args?.object as Record<string, unknown> | undefined;
          return isPrefectureOfRegion(dto?.[regionField], value);
        },
      },
    });
  };
}
