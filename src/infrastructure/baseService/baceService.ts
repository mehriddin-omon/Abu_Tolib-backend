import { HttpException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IFindOptions, IResponse } from './interface';

export class BaseService<CreateDto, Entity> {
  constructor(protected readonly repository: Repository<any>) {}

  get getRepository() {
    return this.repository;
  }

  async create(createDto: CreateDto): Promise<IResponse<Entity>> {
    let createdData = this.repository.create({
      ...createDto,
    }) as unknown as Entity;

    createdData = await this.repository.save(createdData);
    return {
      status: 201,
      message: 'Created successfully',
      data: createdData,
    };
  }

  async findAll(options?: IFindOptions<Entity>): Promise<IResponse<Entity[]>> {
    const data = (await this.repository.find({
      ...options,
    })) as Entity[];
    return {
      status: 200,
      message: 'Success',
      data: data,
    };
  }

  async findOneBy(options: IFindOptions<Entity>): Promise<IResponse<Entity>> {
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

  async findOneById(id: string, options?: IFindOptions<Entity>) {
    const data = (await this.repository.findOne({
      select: options?.select || {},
      relations: options?.relations || [],
      where: { id, ...options?.where },
    })) as unknown as Entity;
    if (!data) {
      throw new HttpException('Not found', 404);
    }
    return {
      status: 200,
      message: 'Success',
      data,
    };
  }

  async update(id: string, dto: Partial<CreateDto>) {
    await this.repository.update(id, {
      ...dto,
      updatedAt: new Date(Date.now()),
    });
    const newData = await this.repository.findOneBy({ id });
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
