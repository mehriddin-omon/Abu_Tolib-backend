import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@my/infrastructure';
import { ResultEntity, TopicEntity, UserEntity } from '@my/core';
import { CreateResultDto } from './dto/create-result.dto';

@Injectable()
export class ResultService extends BaseService<CreateResultDto, ResultEntity> {
  constructor(
    @InjectRepository(ResultEntity)
    private resultRepository: Repository<ResultEntity>,

    @InjectRepository(TopicEntity)
    private topicRepository: Repository<TopicEntity>,

    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
    super(resultRepository)
  }

  async createResult(createResultDto: CreateResultDto) {

    const topic = await this.topicRepository.findOne({
      where: { id: createResultDto.topicId }
    })

    if (!topic) 
      throw new NotFoundException('Topic not found');

    const user = await this.userRepository.findOne({
      where: { id: createResultDto.userId }
    })

    if (!user) throw new NotFoundException('User not found')

    const result = this.resultRepository.create({
      user: user,
      topic: topic,
      totalQuestion: createResultDto.totalQuestion,
      correctAnswer: createResultDto.correctAnswer,
      timeSpent: String(createResultDto.timeSpent),
      detailResults: createResultDto.detailResult
    })
    await this.resultRepository.save(result)
    return {
      status: 201,
      message: 'Result create successfully'
    }
  }

  remove(id: number) {
    return `This action removes a #${id} result`;
  }
}
