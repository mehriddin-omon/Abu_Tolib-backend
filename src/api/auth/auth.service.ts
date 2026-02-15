import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@my/core';
import { CreateUserDto } from '../users';
import { LoginDto } from './dto/login.dto';
import { TokenService } from '@my/common';
import { BaseService } from '@my/infrastructure';

@Injectable()
export class AuthService extends BaseService<CreateUserDto, UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly tokenService: TokenService,
  ) {
    super(userRepository);
  }

  get getRepository() {
    return this.repository;
  }

  async register(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { userName: dto.userName },
    });

    if (existing) {
      throw new BadRequestException('UserName already exist');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ ...dto, password: hashed });
    await this.userRepository.save(user);

    const payload = { sub: user.id, userName: user.userName, role: user.role };
    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = this.tokenService.createRefreshToken(payload);
    return {
      status: 201,
      message: 'User successfulled ✅',
      data: {
        user: {
          id: user.id,
          userName: user.userName,
          role: user.role,
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { userName: dto.userName },
    });

    if (!user) {
      throw new BadRequestException('UserName Not Found');
    }

    const password = await bcrypt.compare(dto.password, user.password);

    if (!password) {
      throw new BadRequestException('Invalid password');
    }

    const payload = { sub: user.id, userName: user.userName, role: user.role };
    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = this.tokenService.createRefreshToken(payload);

    return {
      status: 200,
      message: 'Logged in ✅',
      data: {
        user: {
          id: user.id,
          userName: user.userName,
          role: user.role,
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    };
  }

  // async remove(id: string) {
  //   return `This action removes a #${id} auth`;
  // }
}
