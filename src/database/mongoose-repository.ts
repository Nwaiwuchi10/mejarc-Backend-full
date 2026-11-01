import { Model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FindOptionsWhere<T> = {
  [P in keyof T]?: any;
};

export interface FindOneOptions<T = any> {
  where?: any;
  relations?: string[];
  select?: any;
  order?: any;
}

export interface FindManyOptions<T = any> extends FindOneOptions<T> {
  skip?: number;
  take?: number;
}

export class QueryBuilder<T> {
  private query: any = {};
  private sortObj: any = {};
  private skipVal?: number;
  private limitVal?: number;
  private populateList: string[] = [];
  private isDeleteOp = false;
  private updateSet: any = null;

  constructor(
    private model: Model<T>,
    private alias: string,
  ) { }

  where(condition: any, params?: Record<string, any>): this {
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        this.query[key] = val;
      });
    } else if (typeof condition === 'object' && condition !== null) {
      Object.assign(this.query, condition);
    }
    return this;
  }

  andWhere(condition: any, params?: Record<string, any>): this {
    return this.where(condition, params);
  }

  orWhere(condition: any, params?: Record<string, any>): this {
    return this.where(condition, params);
  }

  leftJoinAndSelect(property: string, alias: string): this {
    const field = property.includes('.') ? property.split('.').pop()! : property;
    if (!this.populateList.includes(field)) {
      this.populateList.push(field);
    }
    return this;
  }

  innerJoinAndSelect(property: string, alias: string): this {
    return this.leftJoinAndSelect(property, alias);
  }

  leftJoin(property: string, alias: string): this {
    return this.leftJoinAndSelect(property, alias);
  }

  innerJoin(property: string, alias: string): this {
    return this.leftJoinAndSelect(property, alias);
  }

  leftJoinAndMapOne(mapToProperty: string, target: any, alias: string, condition?: string): this {
    const field = mapToProperty.includes('.') ? mapToProperty.split('.').pop()! : mapToProperty;
    if (!this.populateList.includes(field)) {
      this.populateList.push(field);
    }
    return this;
  }

  delete(): this {
    this.isDeleteOp = true;
    return this;
  }

  update(targetEntity?: any): this {
    return this;
  }

  set(values: any): this {
    this.updateSet = values;
    return this;
  }

  from(target: any, alias?: string): this {
    return this;
  }

  select(selection?: any): this {
    return this;
  }

  addSelect(selection: any): this {
    return this;
  }

  orderBy(sort: string, order: 'ASC' | 'DESC' | 1 | -1 = 'ASC'): this {
    const field = sort.includes('.') ? sort.split('.').pop()! : sort;
    this.sortObj[field] = order === 'DESC' || order === -1 ? -1 : 1;
    return this;
  }

  addOrderBy(sort: string, order: 'ASC' | 'DESC' | 1 | -1 = 'ASC'): this {
    return this.orderBy(sort, order);
  }

  skip(val: number): this {
    this.skipVal = val;
    return this;
  }

  take(val: number): this {
    this.limitVal = val;
    return this;
  }

  async execute(): Promise<any> {
    if (this.isDeleteOp) {
      return this.model.deleteMany(this.query).exec();
    }
    if (this.updateSet) {
      return this.model.updateMany(this.query, { $set: this.updateSet }).exec();
    }
    return null;
  }

  async getOne(): Promise<any> {
    let q = this.model.findOne(this.query);
    for (const pop of this.populateList) {
      q = q.populate(pop) as any;
    }
    if (Object.keys(this.sortObj).length > 0) {
      q = q.sort(this.sortObj);
    }
    const doc = await q.exec();
    return doc ? (doc as any).toObject ? (doc as any).toObject({ virtuals: true }) : doc : null;
  }

  async getMany(): Promise<any[]> {
    let q = this.model.find(this.query);
    for (const pop of this.populateList) {
      q = q.populate(pop) as any;
    }
    if (Object.keys(this.sortObj).length > 0) {
      q = q.sort(this.sortObj);
    }
    if (this.skipVal !== undefined) {
      q = q.skip(this.skipVal);
    }
    if (this.limitVal !== undefined) {
      q = q.limit(this.limitVal);
    }
    const docs = await q.exec();
    return docs.map((d: any) => (d.toObject ? d.toObject({ virtuals: true }) : d));
  }

  async getManyAndCount(): Promise<[any[], number]> {
    const total = await this.model.countDocuments(this.query).exec();
    const items = await this.getMany();
    return [items, total];
  }

  async getCount(): Promise<number> {
    return this.model.countDocuments(this.query).exec();
  }
}

export class MongooseRepository<T = any> {
  private static repoRegistry = new Map<string, MongooseRepository<any>>();

  static registerRepo(name: string, repo: MongooseRepository<any>) {
    this.repoRegistry.set(name, repo);
  }

  static getRepoByName(name: string): MongooseRepository<any> | undefined {
    return this.repoRegistry.get(name);
  }

  constructor(public readonly model: Model<T>) {
    if (model && model.modelName) {
      MongooseRepository.registerRepo(model.modelName, this);
    }
  }

  get manager(): any {
    return {
      connection: {
        createQueryRunner: () => ({
          connect: async () => { },
          startTransaction: async () => { },
          commitTransaction: async () => { },
          rollbackTransaction: async () => { },
          release: async () => { },
          manager: this.manager,
        }),
      },
      save: async (entityOrTarget: any, entityObj?: any) => {
        if (entityObj !== undefined) {
          const targetName = typeof entityOrTarget === 'function' ? entityOrTarget.name : entityOrTarget;
          const repo = MongooseRepository.getRepoByName(targetName) || this;
          return repo.save(entityObj);
        }
        return this.save(entityOrTarget);
      },
      findOne: async (target: any, options?: any) => {
        if (options !== undefined) {
          const targetName = typeof target === 'function' ? target.name : target;
          const repo = MongooseRepository.getRepoByName(targetName) || this;
          return repo.findOne(options);
        }
        return this.findOne(target);
      },
      create: (target: any, dto?: any) => {
        if (dto !== undefined) {
          const targetName = typeof target === 'function' ? target.name : target;
          const repo = MongooseRepository.getRepoByName(targetName) || this;
          return repo.create(target, dto);
        }
        return this.create(target);
      },
      getRepository: (target: any) => {
        const targetName = typeof target === 'function' ? target.name : target;
        return MongooseRepository.getRepoByName(targetName) || this;
      },
    };
  }

  createQueryBuilder(alias = ''): QueryBuilder<T> {
    return new QueryBuilder(this.model, alias);
  }

  private transformWhere(where: any): any {
    if (!where) return {};
    if (Array.isArray(where)) {
      return { $or: where.map((w) => this.transformWhere(w)) };
    }
    const mongoQuery: any = {};
    for (const [key, val] of Object.entries(where)) {
      if (val === undefined) continue;
      if (val === null) {
        mongoQuery[key] = null;
      } else if (typeof val === 'object' && val !== null) {
        if ('_type' in (val as any)) {
          const typeormSpecial = val as any;
          if (typeormSpecial._type === 'like') {
            const regexStr = typeormSpecial._value.replace(/%/g, '.*');
            mongoQuery[key] = { $regex: new RegExp(regexStr, 'i') };
          } else if (typeormSpecial._type === 'between') {
            mongoQuery[key] = {
              $gte: typeormSpecial._from,
              $lte: typeormSpecial._to,
            };
          } else if (typeormSpecial._type === 'in') {
            mongoQuery[key] = { $in: typeormSpecial._value };
          } else if (typeormSpecial._type === 'isNull') {
            mongoQuery[key] = null;
          } else if (typeormSpecial._type === 'moreThanOrEqual') {
            mongoQuery[key] = { $gte: typeormSpecial._value };
          } else {
            mongoQuery[key] = val;
          }
        } else if (val instanceof RegExp) {
          mongoQuery[key] = val;
        } else {
          mongoQuery[key] = val;
        }
      } else {
        mongoQuery[key] = val;
      }
    }
    return mongoQuery;
  }

  private transformRelations(relations?: string[]): string[] {
    if (!relations) return [];
    return relations.map((rel) => rel.trim());
  }

  private transformOrder(order?: any): any {
    if (!order) return {};
    const sort: any = {};
    for (const [key, val] of Object.entries(order)) {
      sort[key] = val === 'DESC' || val === -1 ? -1 : 1;
    }
    return sort;
  }

  create(dtoOrTarget: any, dtoObj?: any): any {
    let dto = dtoOrTarget;
    let targetClass: any = null;
    if (dtoObj !== undefined) {
      targetClass = dtoOrTarget;
      dto = dtoObj;
    }

    if (Array.isArray(dto)) {
      return dto.map((d) => this.create(d));
    }
    const payload = { ...dto } as any;
    if (!payload.id) {
      payload.id = uuidv4();
    }

    let instance: any;
    if (typeof targetClass === 'function') {
      instance = new targetClass();
      Object.assign(instance, payload);
    } else {
      instance = Object.assign({}, payload);
    }
    return instance;
  }

  async save(entityOrEntities: any): Promise<any> {
    if (Array.isArray(entityOrEntities)) {
      return Promise.all(entityOrEntities.map((e) => this.save(e)));
    }
    const item = entityOrEntities;
    if (!item) return item;

    // Auto-generate Product ID if saving a MarketProduct without one
    if (this.model && this.model.modelName === 'MarketProduct' && !item.productId) {
      let prefix = 'BLP';
      const cat = item.category;
      if (cat === 'Product Design' || cat === 'Interior Design') {
        prefix = 'PRD';
      } else if (cat === 'Building Guide' || cat === 'Landscape Design') {
        prefix = 'BLG';
      }
      const count = await this.model.countDocuments().exec();
      item.productId = `${prefix}${String(count + 1).padStart(3, '0')}`;
    }

    // Auto-generate Vendor ID if saving an Agent without one (not more than 6 characters e.g. VN0001)
    if (this.model && this.model.modelName === 'Agent' && !item.vendorId) {
      const count = await this.model.countDocuments().exec();
      item.vendorId = `VN${String(count + 1).padStart(4, '0')}`;
    }

    // Run BeforeInsert / hashPassword hook if defined
    if (typeof item.hashPassword === 'function') {
      await item.hashPassword();
    }

    if (typeof item.save === 'function') {
      const saved = await item.save();
      return saved.toObject ? saved.toObject({ virtuals: true }) : saved;
    }

    const id = item.id || (item._id ? item._id.toString() : uuidv4());
    item.id = id;
    const upserted = await this.model.findOneAndUpdate(
      { id },
      { $set: item },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return upserted ? (upserted.toObject ? upserted.toObject({ virtuals: true }) : upserted) : item;
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    const filter = this.transformWhere(options?.where);
    let q = this.model.find(filter);
    const rels = this.transformRelations(options?.relations);
    for (const rel of rels) {
      q = q.populate(rel) as any;
    }
    if (options?.order) {
      q = q.sort(this.transformOrder(options.order));
    }
    if (options?.skip !== undefined) {
      q = q.skip(options.skip);
    }
    if (options?.take !== undefined) {
      q = q.limit(options.take);
    }
    const docs = await q.exec();
    return docs.map((d: any) => (d.toObject ? d.toObject({ virtuals: true }) : d)) as T[];
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    const filter = this.transformWhere(options.where);
    let q = this.model.findOne(filter);
    const rels = this.transformRelations(options.relations);
    for (const rel of rels) {
      q = q.populate(rel) as any;
    }
    if (options.order) {
      q = q.sort(this.transformOrder(options.order));
    }
    const doc = await q.exec();
    return doc ? ((doc as any).toObject ? (doc as any).toObject({ virtuals: true }) : (doc as any)) : null;
  }

  async findBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T[]> {
    return this.find({ where });
  }

  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T | null> {
    return this.findOne({ where });
  }

  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    const filter = this.transformWhere(options?.where);
    const count = await this.model.countDocuments(filter).exec();
    const rows = await this.find(options);
    return [rows, count];
  }

  async count(options?: FindOneOptions<T>): Promise<number> {
    const filter = this.transformWhere(options?.where);
    return this.model.countDocuments(filter).exec();
  }

  async update(criteria: any, partialEntity: any): Promise<any> {
    let filter = typeof criteria === 'string' || typeof criteria === 'number'
      ? { id: criteria }
      : this.transformWhere(criteria);
    const res = await this.model.updateMany(filter, { $set: partialEntity }).exec();
    return {
      raw: res,
      affected: res.modifiedCount,
      generatedMaps: [],
    };
  }

  async delete(criteria: any): Promise<any> {
    let filter = typeof criteria === 'string' || typeof criteria === 'number'
      ? { id: criteria }
      : this.transformWhere(criteria);
    const res = await this.model.deleteMany(filter).exec();
    return {
      raw: res,
      affected: res.deletedCount,
    };
  }

  async remove(entityOrEntities: any): Promise<any> {
    if (Array.isArray(entityOrEntities)) {
      return Promise.all(entityOrEntities.map((e) => this.remove(e)));
    }
    const id = entityOrEntities?.id;
    if (id) {
      await this.model.deleteOne({ id }).exec();
    }
    return entityOrEntities;
  }

  async softDelete(criteria: any): Promise<any> {
    return this.update(criteria, { deletedAt: new Date() });
  }

  async softRemove(entityOrEntities: any): Promise<any> {
    if (Array.isArray(entityOrEntities)) {
      return Promise.all(entityOrEntities.map((e) => this.softRemove(e)));
    }
    if (entityOrEntities?.id) {
      await this.softDelete(entityOrEntities.id);
    }
    return entityOrEntities;
  }

  async query(queryString: string, params?: any[]): Promise<any> {
    return [{ '?column?': 1 }];
  }
}

