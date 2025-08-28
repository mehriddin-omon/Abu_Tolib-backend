import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';
import { SubjectEntity, TopicEntity } from '@my/core';
import { BaseService, IResponse } from '@my/infrastructure';

@Injectable()
export class SubjectService extends BaseService<
  CreateSubjectDto,
  SubjectEntity
> {
  constructor(
    @InjectRepository(SubjectEntity)
    private subjectRepository: Repository<SubjectEntity>,

    @InjectRepository(TopicEntity)
    private topicRepository: Repository<TopicEntity>,
  ) {
    super(subjectRepository);
  }

  async createSubject(createSubjectDto: CreateSubjectDto) {
    // Check if the subject already exists
    const existingSubject = await this.subjectRepository.findOne({
      where: { name: createSubjectDto.name },
    });
    if (existingSubject) {
      throw new BadRequestException('Subject already exist');
    }

    const subject = this.subjectRepository.create({
      name: createSubjectDto.name,
    });
    subject.topics = [];
    const data = await this.subjectRepository.save(subject);

    return {
      status: 201,
      message: 'Subject succesfulle 👍',
      data: data,
    };
  }

  async findAllSubjects() {
    const subjects = await this.subjectRepository.find({
      relations: {
        topics: true,
      },
    });
    if (!subjects) throw new NotFoundException('Subjects not found');
    return {
      status: 200,
      message: 'Subjects found',
      data: subjects,
    };
  }

  async findOneSubject(id: string) {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: {
        topics: true,
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    return {
      status: 200,
      message: 'Subject found',
      data: subject,
    };
  }

  async updateSubject(
    id: string,
    dto: UpdateSubjectDto,
  ): Promise<IResponse<SubjectEntity>> {
    const subject = await this.subjectRepository.findOne({ where: { id } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    await this.subjectRepository.update(id, {
      ...dto,
    });

    const updatedSubject = await this.subjectRepository.findOne({
      where: { id },
    });

    return {
      status: 200,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  async deleteSubject(id: string) {
    const subject = await this.findOneSubject(id);
    if (!subject) throw new NotFoundException('Subject not found');
    return {
      status: 200,
      message: 'Subject deleted successfully',
    };
  }
}
