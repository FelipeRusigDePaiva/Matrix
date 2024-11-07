import { Controller, Post, Param, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post(':userId/create-deck')
  async createDeck(@Param('userId') userId: string) {
    if (!(await this.usersService.canCreateDeck(userId))) {
      throw new BadRequestException('Limite de decks criados alcançado');
    }
    const user = await this.usersService.getUser(userId);
    const decksCreated = user.decksCreated + 1;
    return this.usersService.updateUser(userId, decksCreated, user.decksPublished);
  }

  @Post(':userId/publish-deck')
  async publishDeck(@Param('userId') userId: string) {
    if (!(await this.usersService.canPublishDeck(userId))) {
      throw new BadRequestException('Limite de decks publicados alcançado');
    }
    const user = await this.usersService.getUser(userId);
    const decksPublished = user.decksPublished + 1;
    return this.usersService.updateUser(userId, user.decksCreated, decksPublished);
  }
}