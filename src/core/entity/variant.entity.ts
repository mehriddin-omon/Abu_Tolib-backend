import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@my/common';
import { QuestionEntity } from './question.entity';

@Entity({ name: 'variants' })
export class VariantEntity extends BaseEntity {
  @Column({ type: 'varchar', name: 'name' })
  name: string;

  @Column({ type: 'boolean', name: 'isCorrect', default: false })
  isCorrect: boolean;

  @ManyToOne(() => QuestionEntity, (question) => question.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: QuestionEntity;
}
