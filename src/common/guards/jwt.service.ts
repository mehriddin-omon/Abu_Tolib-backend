import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from '@my/config';
interface JwtPayload {
  secret: string;
}
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) { }

  createAccessToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: config.JWT_ACCESS_SECRET,
      expiresIn: config.JWT_ACCESS_TIME,
    });
  }

  createRefreshToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: config.JWT_REFRESH_SECRET,
      expiresIn: config.JWT_REFRESH_TIME,
    });
  }
  async verifyAccessToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: config.JWT_ACCESS_SECRET,
      });
      return payload;
    } catch (error) {
      console.error('Token verification failed:', (error as Error).message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: config.JWT_REFRESH_SECRET,
      });
      return payload;
    } catch (error) {
      console.error('Token verification failed:', (error as Error).message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
