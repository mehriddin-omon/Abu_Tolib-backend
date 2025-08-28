import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import {
  BaseEntity,
  QuestionLevel,
  QuestionTime,
  QuestionType,
} from '@my/common';
import { TopicEntity } from './topic.entity';
import { VariantEntity } from './variant.entity';

@Entity({ name: 'questions' })
export class QuestionEntity extends BaseEntity {
  @Column({ type: 'varchar', name: 'text', nullable: false })
  text: string;

  @Column({
    type: 'varchar',
    name: 'type',
    enum: QuestionType,
    default: QuestionType.SINGLE,
  })
  type: QuestionType;

  @Column({
    type: 'varchar',
    name: 'level',
    enum: QuestionLevel,
    default: QuestionLevel.EASY,
  })
  level: QuestionLevel;

  @Column({
    type: 'varchar',
    name: 'time',
    enum: QuestionTime,
    default: QuestionTime.MEDIUM,
  })
  time: QuestionTime;

  @Column({ type: 'varchar', name: 'imgUrl', nullable: true })
  imgUrl: string | null;

  // Tags for the question, stored as a simple array: bunda savol qaysi mavzuga tegishli ekanligi beriladi
  @Column({ type: 'simple-array', name: 'tags', nullable: true })
  tags: string[] | null;

  @ManyToOne(() => TopicEntity, (topic) => topic.questions, { onDelete: 'CASCADE', })
  @JoinColumn({ name: 'topicId' })
  topic: TopicEntity;

  @Column({ name: "topicId", type: "uuid" })
  topicId: string; // topicId ni faqat id sifatida beramiz      

  @OneToMany(() => VariantEntity, (variant) => variant.question)
  variants: VariantEntity[];
}
