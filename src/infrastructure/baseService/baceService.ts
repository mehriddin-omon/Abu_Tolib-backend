import { HttpException } from '@nestjs/common';
import { Repository, DeepPartial, FindManyOptions } from 'typeorm';
import { IResponse } from './interface';

export class BaseService<CreateDto extends DeepPartial<Entity>, Entity extends { id: string }> {
  constructor(protected readonly repository: Repository<Entity>) { }

  get getRepository() {
    return this.repository;
  }

  async create(createDto: CreateDto): Promise<IResponse<Entity>> {
    const createdData = this.repository.create(createDto);
    const savedData = await this.repository.save(createdData);
    return {
      status: 201,
      message: 'Created successfully',
      data: savedData
    };
  }

  async findAll(options?: FindManyOptions<Entity>): Promise<IResponse<Entity[]>> {
    const data = (await this.repository.find({ ...options }));
    return {
      status: 200,
      message: 'Success',
      data: data,
    };
  }

  async findOneBy(options: FindManyOptions<Entity>): Promise<IResponse<Entity>> {
    const data = (await this.repository.findOne({
      select: options.select || {},
      relations: options.relations || [],
      where: options.where,
    })) as Entity;
    if (!data) {
      throw new HttpException('Not found', 404);
    }
    return {
      status: 200,
      message: 'Succcess',
      data: data,
    };
  }

  async findOneById(id: string, options?: FindManyOptions<Entity>) {
    const where = { ...(options?.where || {}), id } as import('typeorm').FindOptionsWhere<Entity>;
    const data = await this.repository.findOne({
      select: options?.select || {},
      relations: options?.relations || [],
      where,
    });
    if (!data) {
      throw new HttpException('Not found', 404);
    }
    return {
      status: 200,
      message: 'Success',
      data,
    };
  }
  async update(id: string, dto: any) {
    await this.repository.update(id, dto);
    const newData = await this.findOneById(id);
    return {
      status: 200,
      message: 'Updated',
      data: newData,
    };
  }

  async delete(id: string) {
    (await this.repository.delete(id)) as unknown as Entity;
    return {
      status: 200,
      message: 'Deleted',
      data: { id },
    };
  }
}
