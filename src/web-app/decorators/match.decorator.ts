import { registerDecorator, ValidationOptions } from "class-validator";

export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: Object, propertyName: string): any => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value, args) {
          const [relatedProperyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedProperyName];
          return value === relatedValue;
        },

      }

    })
  }

}
