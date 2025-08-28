import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ComandaService } from './comanda.service';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { CreateComandaDto } from './dto/create-comanda.dto';
import { strongEtagFrom } from '@common/utils/etag.util';

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

  @Get(':id/snapshot')
  async snapshot(@Param('id') id: string, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const data = await this.service.getSnapshot(id);

    const etag = strongEtagFrom({
      id: data.id,
      name: data.name,
      status: data.status,
      ownerId: data.ownerId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      participants: data.participants,
    });

    res.header('ETag', etag);
    res.header('Cache-Control', 'public, max-age=0, must-revalidate, stale-while-revalidate=30');

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).send();
    }

    return res.status(200).send(data);
  }

  @Get(':id/totals')
  async totals(@Param('id') id: string) {
    return this.service.getTotals(id);
  }
}
