import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ComandaService } from './comanda.service';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { CreateComandaDto } from './dto/create-comanda.dto';

@Controller('comandas')
@UseGuards(JwtAuthGuard)
export class ComandaController {
  constructor(private readonly service: ComandaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@AuthUser() user: { sub: string }, @Body() dto: CreateComandaDto) {
    const result = await this.service.createComanda(user.sub, dto.name, dto.participants);

    return {
      id: result.comanda.id,
      name: result.comanda.name,
      status: result.comanda.status,
      ownerId: result.comanda.ownerId,
      createdAt: result.comanda.createdAt,
      participantsCount: result.participantsCount,
    };
  }
}
