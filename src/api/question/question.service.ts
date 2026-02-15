import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionEntity, TopicEntity } from '@my/core';
import { BaseService, IResponse } from '@my/infrastructure';
import { CreateQuestionDto } from './dto';

@Injectable()
export class QuestionService extends BaseService<
  CreateQuestionDto,
  QuestionEntity
> {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,

    @InjectRepository(TopicEntity)
    private readonly topicRepository: Repository<TopicEntity>,
  ) {
    super(questionRepository);
  }

  // ✅ Question yaratish
  async createQuestion(topicId: string, createQuestionDto: CreateQuestionDto) {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
    });

    if (!topic) throw new NotFoundException('Topic not found');

    const variants = []
    const Question = this.questionRepository.create({
      ...createQuestionDto,
      topicId: topic.id, // topicId ni faqat id sifatida beramiz
      variants: variants, // variantlarni bo'sh array sifatida qo'shamiz
    });

    const savedQuestion = await this.questionRepository.save(Question); // bazaga saqlanadi
    return {
      status: 201,
      message: 'Topic created successfully',
      data: savedQuestion,
    };
  }

  // ✅ Barcha Questionlarni olish
  async findTopicQuestion(id: string): Promise<IResponse<QuestionEntity[]>> {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
    const Questions = await this.questionRepository.find({
      // where: { topic: { id: topic.id } },
      relations: ['variants']
    });
    if (!Questions) throw new NotFoundException('Questions not found');

    return {
      status: 200,
      message: 'Questions found',
      data: Questions,
    };
  }

  // ✅ ID bo‘yicha Questionni olish
  async findOneQuestion(questionId: string) {
    const findQuestion = await this.questionRepository.findOne(
      { 
        where: { id: questionId },
        relations:['variants']
      },
    );

    if (!findQuestion) {
      throw new NotFoundException('Question not found');
    }

    return {
      status: 200,
      message: 'Question found',
      data: findQuestion,
    };
  }

  // // ✅ Questionni yangilash
  // async updateQuestion(
  //   id: string,
  //   dto: UpdateQuestionDto,
  // ): Promise<IResponse<QuestionEntity>> {
  //   const question = await this.questionRepository.findOne({ where: { id } });
  //   if (!question) {
  //     throw new NotFoundException('Question not found');
  //   }
  //   // dto ni aniq ishlatish
  //   const updateData = {
  //     updatedAt: new Date(),
  //     ...dto,
  //   };

  //   await this.questionRepository.update(id, updateData);
  //   const updated = await this.questionRepository.findOne({ where: { id } });
  //   return {
  //     statusCode: 200,
  //     message: 'Question updated successfully',
  //     data: updated,
  //   };
  // }

  // ✅ Questionni o‘chirish
  
  async deleteQuestion(id: string): Promise<IResponse<QuestionEntity>> {
    if (!id) {
      throw new NotFoundException('Question not found');
    }

    await this.questionRepository.delete(id);
    return {
      status: 200,
      message: 'Question deleted successfully',
      data: null,
    };
  }
}
