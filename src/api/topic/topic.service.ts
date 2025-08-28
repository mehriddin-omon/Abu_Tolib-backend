import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicEntity } from '../../core/entity/topic.entity';
import { CreateTopicDto } from './dto/createTopic.dto';
import { SubjectEntity } from '../../core/entity/subject.entity';
import { BaseService } from '@my/infrastructure';
import { UpdateTopicDto } from './dto';
import { QuestionEntity, VariantEntity } from '@my/core';

@Injectable()
export class TopicService extends BaseService<CreateTopicDto, TopicEntity> {
  constructor(
    @InjectRepository(TopicEntity)
    private topicRepository: Repository<TopicEntity>,

    @InjectRepository(SubjectEntity)
    private subjectRepository: Repository<SubjectEntity>,

    @InjectRepository(QuestionEntity)
    private questionRepository: Repository<QuestionEntity>,
  ) {
    super(topicRepository);
  }

  // Topic created
  async createTopic(subjectId: string, createTopicDto: CreateTopicDto) {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId },
    });

    if (!subject) throw new NotFoundException('Subject not found');

    const topic = this.topicRepository.create({
      title: createTopicDto.title,
      subject: subject, // subjectId ni faqat id sifatida beramiz
    });

    topic.questions = []; // subjectId ni faqat id sifatida beramiz
    const savedTopic = await this.topicRepository.save(topic);

    return {
      status: 201,
      message: 'Topic created successfully',
      data: savedTopic,
    };
  }

  async findAllTopics() {
    const topics = await this.topicRepository.find({
      select: {
        id: true,
        title: true,
        subject: {
          id: true,
          name: true,
        },
        questions: {
          variants: true,
        },
      },
      relations: ['subject'],
    });
    if (!topics) throw new NotFoundException('Topics not found');
    return {
      status: 200,
      message: 'Topics found',
      data: topics,
    };
  }

  async findOneTopic(id: string) {
    const topic = await this.topicRepository.findOne({
      where: { id },
      relations: ['subject', 'questions', 'questions.variants'],
    });
    if (!topic) throw new NotFoundException('Topic not found');

    const topicResponse = {
      id: topic.id,
      title: topic.title,
      subjectId: topic.subject.id,
      questions: topic.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type,
        level: question.level,
        time: question.time,
        imgUrl: question.imgUrl,
        tags: question.tags,
        variants: question.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          isCorrect: variant.isCorrect,
        })),
      })),
    };

    return {
      status: 200,
      message: 'Topic found',
      data: topicResponse,
    };
  }

  async createTopicWithQuestions(dto: CreateTopicDto) {
    // 1. Subjectni tekshirish
    const subject = await this.subjectRepository.findOne({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // 2. Mavzuni yaratish
    const topic = this.topicRepository.create({
      title: dto.title,
      subject: subject,
    });
    const savedTopic = await this.topicRepository.save(topic);

    // 3. Savollarni tayyorlash va bulk saqlash
    let savedQuestions: QuestionEntity[] = [];
    if (dto.questions && dto.questions.length > 0) {
      const questionEntities = dto.questions.map(q => {
        const variants = q.variants
          ? q.variants.map(v => {
            console.log(v);
            const variant = new VariantEntity();
            variant.name = v.name;
            variant.isCorrect = v.isCorrect;
            return variant;
          })
          : [];
        return {
          ...q,
          topic: savedTopic,
          topicId: savedTopic.id,
          variants,
        };
      });
      savedQuestions = await this.questionRepository.save(questionEntities);
    }

    // 4. Javob
    return {
      status: 201,
      message: 'Topic and questions created successfully',
      data: {
        topic: savedTopic,
        questions: savedQuestions,
      },
    };
  }

  async updateTopic(id: string, updateTopicDto: UpdateTopicDto) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');

    // Update the topic with new data
    Object.assign(topic, updateTopicDto);

    const updatedTopic = await this.topicRepository.save(topic);
    return {
      status: 200,
      message: 'Topic updated successfully',
      data: updatedTopic,
    };
  }

  async deleteTopic(id: string) {
    const topic = await this.topicRepository.findOne({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');
    return {
      status: 200,
      message: 'Topic deleted successfully',
      data: await this.topicRepository.remove(topic),
    };
  }
}
