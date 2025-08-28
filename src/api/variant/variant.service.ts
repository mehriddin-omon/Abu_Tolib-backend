import { QuestionEntity, VariantEntity } from "@my/core";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateVariantDto } from "./dto";
import { IResponse } from "@my/infrastructure";

@Injectable()
export class VariantService {
  constructor(
    @InjectRepository(VariantEntity)
    private readonly variantRepository: Repository<VariantEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
  ) { }

  // Yangi variant yaratish
  async createQuestion(questionId: string, createVariantDto: CreateVariantDto): Promise<IResponse<VariantEntity>> {

    // Savolni tekshirish
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const variant = this.variantRepository.create({
      ...createVariantDto,
      question: question, // Savolni qo'shish
    });

    const saveVariant = await this.variantRepository.save(variant);

    return {
      status: 200,
      message: 'Variant created successfully',
      data: saveVariant,
    };
  }

  // Barcha variantlarni olish
  async findAll(): Promise<VariantEntity[]> {
    return this.variantRepository.find({
      relations: ['question'],
    });
  }

  // ID bo'yicha variant topish
  async findById(id: string): Promise<VariantEntity> {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['question'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  // Savol bo'yicha variantlarni olish
  async findByQuestionId(questionId: string): Promise<IResponse<VariantEntity[]>> {

    const question = await this.variantRepository.find({
      where: { id: questionId },
      relations: ['question'],
    })
    console.log(question)
    if (!question) {
      throw new NotFoundException('Not found')
    }

    return {
      status: 200,
      message: "found question",
      data: question
    };
  }

  // To'g'ri javoblarni olish
  async findCorrectVariants(): Promise<VariantEntity[]> {
    return this.variantRepository.find({
      where: { isCorrect: true },
      relations: ['question'],
    });
  }

  // Savol bo'yicha to'g'ri javobni olish
  async findCorrectByQuestionId(questionId: string): Promise<VariantEntity[]> {
    return this.variantRepository.find({
      where: {
        id: questionId,
        isCorrect: true
      },
      relations: ['question'],
    });
  }


  // Bir nechta variant yaratish
  // async createMany(createVariantsDto: CreateVariantDto[]): Promise<IResponse<VariantEntity[]>> {
  //   const variants = [];

  //   for (const dto of createVariantsDto) {
  //     const variant = await this.createQuestion(dto);
  //     variants.push(variant);
  //   }

  //   return {
  //     statusCode: 200,
  //     message: 'Variant created successfully',
  //     data: variants,
  //   };
  // }

  // Variantni yangilash
  // async update(id: string, updateVariantDto: UpdateVariantDto): Promise<VariantEntity> {
  //   const variant = await this.findById(id);

  //   if (updateVariantDto.questionId) {
  //     const question = await this.questionRepository.findOne({
  //       where: { id: updateVariantDto.questionId },
  //     });

  //     if (!question) {
  //       throw new NotFoundException(`Question with ID ${updateVariantDto.questionId} not found`);
  //     }

  //     variant.question = question;
  //     variant.question = updateVariantDto.questionId;
  //   }

  //   if (updateVariantDto.name !== undefined) {
  //     variant.name = updateVariantDto.name;
  //   }

  //   if (updateVariantDto.isCorrect !== undefined) {
  //     variant.isCorrect = updateVariantDto.isCorrect;
  //   }

  //   return this.variantRepository.save(variant);
  // }

  // Variantni o'chirish
  // async delete(id: string): Promise<void> {
  //   const variant = await this.findById(id);
  //   await this.variantRepository.remove(variant);
  // }

  // // Savol bo'yicha barcha variantlarni o'chirish
  // async deleteByQuestionId(questionId: string): Promise<void> {
  //   await this.variantRepository.delete({ questionId });
  // }

  // // Variantlarni qidirish (nom bo'yicha)
  // async search(searchTerm: string): Promise<VariantEntity[]> {
  //   return this.variantRepository
  //     .createQueryBuilder('variant')
  //     .leftJoinAndSelect('variant.question', 'question')
  //     .where('variant.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
  //     .getMany();
  // }

  // Statistika
  async getStats() {
    const total = await this.variantRepository.count();
    const correct = await this.variantRepository.count({
      where: { isCorrect: true },
    });
    const incorrect = total - correct;

    return {
      total,
      correct,
      incorrect,
      correctPercentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }
}