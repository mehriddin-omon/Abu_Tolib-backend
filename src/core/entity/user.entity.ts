import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity, Role } from '@my/common';
import { ResultEntity } from './result.entity';

@Entity({ name: 'users' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', name: 'firstName', length: 36 })
  firstName: string;

  @Column({ type: 'varchar', name: 'lastName', length: 36 })
  lastName: string;

  @Column({ type: 'varchar', name: 'birthDate', length: 36 })
  birthDate: Date;

  @Column({ type: 'varchar', name: 'phoneNumber', unique: false })
  phoneNumber: string;

  @Column({ type: 'varchar', name: 'userName', unique: true })
  userName: string;

  @Column({ type: 'varchar', name: 'password' })
  password: string;

  @Column({
    type: 'enum',
    name: 'role',
    enum: Role,
    default: Role.USER,
  })
  role: string;

  // Relationships
  @OneToMany(() => ResultEntity, (result) => result.user, { onDelete: 'CASCADE' })
  results: ResultEntity[];
}
