import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@my/common';
import { SubjectEntity } from './subject.entity';
import { QuestionEntity } from './question.entity';
import { ResultEntity } from './result.entity';

@Entity({ name: 'topics' })
export class TopicEntity extends BaseEntity {

  @Column({ type: 'varchar', name: 'title' })
  title: string;

  @ManyToOne(() => SubjectEntity, (subject) => subject.topics, { onDelete: 'CASCADE', })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @OneToMany(() => QuestionEntity, (question) => question.topic)
  questions: QuestionEntity[];

  @OneToMany(()=> ResultEntity, (result)=> result.topic, )
  results: ResultEntity[];
}
