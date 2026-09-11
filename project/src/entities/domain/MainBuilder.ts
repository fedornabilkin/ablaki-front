import { MainEntity } from './MainEntity';

export abstract class MainBuilder<TEntity extends MainEntity> {
  protected entity: TEntity;
  constructor() { this.entity = this.createEntity(); }
  protected abstract createEntity(): TEntity;
  build(data: Record<string, unknown>): this {
    if (Number.isSafeInteger(Number(data.id))) this.entity.id = Number(data.id);
    if (Number.isFinite(Number(data.created_at))) this.entity.createdAt = Number(data.created_at);
    return this;
  }
  getEntity(): TEntity { const result = this.entity; this.entity = this.createEntity(); return result; }
}
