import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'createdAt',
    type: 'date',
    default: new Date(Date.now()),
  })
  createdAt: Date;

  @Column({
    name: 'updatesAt',
    type: 'date',
    default: new Date(Date.now()),
  })
  updatedAt: Date;
}
