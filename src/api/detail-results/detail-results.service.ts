import { Injectable } from '@nestjs/common';
import { CreateDetailResultDto } from './dto/create-detail-result.dto';
import { UpdateDetailResultDto } from './dto/update-detail-result.dto';

@Injectable()
export class DetailResultsService {
  create(createDetailResultDto: CreateDetailResultDto) {
    return 'This action adds a new detailResult';
  }

  findAll() {
    return `This action returns all detailResults`;
  }

  findOne(id: number) {
    return `This action returns a #${id} detailResult`;
  }

  update(id: number, updateDetailResultDto: UpdateDetailResultDto) {
    return `This action updates a #${id} detailResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} detailResult`;
  }
}
