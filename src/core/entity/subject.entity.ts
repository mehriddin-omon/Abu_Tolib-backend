import { Column, Entity, OneToMany } from 'typeorm';
import { TopicEntity } from './topic.entity';
import { BaseEntity } from '@my/common';

@Entity({ name: 'subjects' })
export class SubjectEntity extends BaseEntity {
  @Column({ type: 'varchar', name: 'name' })
  name: string;

  @OneToMany(() => TopicEntity, (topic) => topic.subject)
  topics: TopicEntity[];
}
