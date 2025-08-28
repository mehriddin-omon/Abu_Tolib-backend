import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';

export class UserRepository extends Repository<UserEntity> {
  findByName(firstName: string, lastName: string) {
    return this.createQueryBuilder('user')
      .where('user.firstName = :firstName', { firstName })
      .andWhere('user.lastName = :lastName', { lastName })
      .getMany();
  }
}