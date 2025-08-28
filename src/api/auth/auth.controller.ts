import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users';
import { Public } from '@my/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // @Post('refresh')
  // async refresh(@Body() refreshToken: string) {
  //   return this.authService.refresh(refreshToken);
  // }
  // @Post('logout')
  // async logout(@Body() refreshToken: string) {
  //   return this.authService.logout(refreshToken);
  // }
  // @Post('verify')
  // async verify(@Body() accessToken: string) {
  //   return this.authService.verify(accessToken);
  // }
  // @Post('forgot-password')
  // async forgotPassword(@Body() email: string) {
  //   return this.authService.forgotPassword(email);
  // }
  // @Post('reset-password')
  // async resetPassword(@Body() resetPasswordDto: { token: string; password: string }) {
  //   return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
  // }
  // @Post('change-password')
  // async changePassword(@Body() changePasswordDto: { userId: string; oldPassword: string; newPassword: string }) {
  //   return this.authService.changePassword(changePasswordDto.userId, changePasswordDto.oldPassword, changePasswordDto.newPassword);
  // }
  // @Post('update-profile')
  // async updateProfile(@Body() updateProfileDto: { userId: string; name: string; email: string }) {
  //   return this.authService.updateProfile(updateProfileDto.userId, updateProfileDto.name, updateProfileDto.email);
  // }
  // @Post('delete-account')
  // async deleteAccount(@Body() userId: string) {
  //   return this.authService.deleteAccount(userId);
  // }
  // @Post('get-user')
  // async getUser(@Body() userId: string) {
  //   return this.authService.getUser(userId);
  // }
  // @Post('get-all-users')
  // async getAllUsers() {
  //   return this.authService.getAllUsers();
  // }
}
