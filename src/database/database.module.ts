import {
  DynamicModule,
  Module,
  Provider,
  Global,
  Inject,
} from '@nestjs/common';
import {
  MongooseModule,
  getModelToken as getMongooseModelToken,
} from '@nestjs/mongoose';
import { Model, Schema } from 'mongoose';
import { MongooseRepository } from './mongoose-repository';

export function getRepositoryToken(entity: any): string {
  const name = typeof entity === 'function' ? entity.name : entity;
  return `${name}Repository`;
}

export function InjectRepository(entity: any) {
  return Inject(getRepositoryToken(entity));
}

// Re-export Repository type for services
export type Repository<T = any> = MongooseRepository<T>;

// TypeORM helper mock functions for query objects
export function Like(pattern: string) {
  return { _type: 'like', _value: pattern };
}

export function Between(from: any, to: any) {
  return { _type: 'between', _from: from, _to: to };
}

export function In(values: any[]) {
  return { _type: 'in', _value: values };
}

export function IsNull() {
  return { _type: 'isNull' };
}

export function MoreThanOrEqual(value: any) {
  return { _type: 'moreThanOrEqual', _value: value };
}

export class DataSource {
  async transaction<T>(callback: (manager: any) => Promise<T>): Promise<T> {
    const mockRepo = new MongooseRepository({} as any);
    return callback(mockRepo.manager);
  }
}

// Dummy decorator stubs for TypeORM decorators so entity files continue to evaluate seamlessly
export function Entity(name?: string, options?: any): ClassDecorator {
  return (target: any) => target;
}
export function PrimaryGeneratedColumn(type?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function PrimaryColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function Column(typeOrOptions?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function CreateDateColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function UpdateDateColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function DeleteDateColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function ManyToOne(typeFunctionOrTarget?: any, inverseSideOrOptions?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function OneToMany(typeFunctionOrTarget?: any, inverseSideOrOptions?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function OneToOne(typeFunctionOrTarget?: any, inverseSideOrOptions?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function ManyToMany(typeFunctionOrTarget?: any, inverseSideOrOptions?: any, options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function JoinColumn(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function JoinTable(options?: any): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function Index(nameOrFields?: any, fieldsOrOptions?: any, options?: any): any {
  return (target: any, propertyKey?: string | symbol) => {};
}
export function Unique(nameOrFields?: any, fields?: any): any {
  return (target: any, propertyKey?: string | symbol) => {};
}
export function BeforeInsert(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}
export function BeforeUpdate(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {};
}

// Registry for schemas
const schemaRegistry = new Map<string, Schema>();

export function registerSchema(name: string, schema: Schema) {
  schemaRegistry.set(name, schema);
}

export function getSchema(name: string): Schema | undefined {
  return schemaRegistry.get(name);
}

@Global()
@Module({})
export class DatabaseModule {
  static forFeature(entities: any[]): DynamicModule {
    const mongooseModels = entities.map((entity) => {
      const name = typeof entity === 'function' ? entity.name : entity;
      const schema = schemaRegistry.get(name) || new Schema({}, { strict: false, timestamps: true, id: false });
      return { name, schema };
    });

    const providers: Provider[] = entities.map((entity) => {
      const name = typeof entity === 'function' ? entity.name : entity;
      return {
        provide: getRepositoryToken(entity),
        useFactory: (model: Model<any>) => new MongooseRepository(model),
        inject: [getMongooseModelToken(name)],
      };
    });

    return {
      module: DatabaseModule,
      imports: [MongooseModule.forFeature(mongooseModels)],
      providers: [...providers, DataSource],
      exports: [...providers, DataSource, MongooseModule],
    };
  }
}
export const TypeOrmModule = DatabaseModule;

