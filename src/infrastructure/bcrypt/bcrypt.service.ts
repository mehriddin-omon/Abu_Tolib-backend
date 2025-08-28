import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  salt = 10;
  async encrypt(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.salt);
    } catch (error) {
      throw new BadRequestException(`Error on encrypt: ${error}`);
    }
  }
  async compare(password: string, hashPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashPassword);
    } catch (error) {
      throw new BadRequestException(`Error on decrypt: ${error}`);
    }
  }
}
