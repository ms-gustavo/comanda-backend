import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
import { GetMyComandasQueryDto } from './dto/get-my-comandas.query';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PutItemRateioDto } from './dto/put-item-rateio.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import * as QRCode from 'qrcode';
import { CloseComandaDto } from './dto/close-comanda.dto';

@Controller('comandas')
@UseGuards(JwtAuthGuard)
export class ComandaController {
  constructor(private readonly service: ComandaService) {}

  @Get()
  async listMyComandas(@AuthUser() user: { sub: string }, @Query() query: GetMyComandasQueryDto) {
    const res = await this.service.listMyComandas(user.sub, {
      role: query.role ?? 'all',
      status: query.status,
      q: query.q,
      cursor: query.cursor,
      limit: query.limit ?? 20,
    });

    return res;
  }

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

  @Get(':id/items')
  async listItems(@Param('id') id: string) {
    const items = await this.service.listItems(id);
    return items.map((it) => ({ ...it, price: (it.price as any).toFixed(2) }));
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(@Param('id') id: string, @Body() dto: CreateItemDto) {
    const it = await this.service.addItems(id, dto);
    return { ...it, price: (it.price as any).toFixed(2) };
  }

  @Patch('/items/:itemId')
  async updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    const it = await this.service.updateItem(itemId, dto);
    return { ...it, price: (it.price as any).toFixed(2) };
  }

  @Delete('/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Param('itemId') itemId: string) {
    await this.service.removeItem(itemId);
  }

  @Get('/items/:itemId/rateio')
  async getItemRateio(@Param('itemId') itemId: string) {
    return this.service.getItemRateio(itemId);
  }

  @Put('/items/:itemId/rateio')
  async putItemRateio(@Param('itemId') itemId: string, @Body() dto: PutItemRateioDto) {
    return this.service.putItemRateio(itemId, dto.entries);
  }

  @Delete('/items/:itemId/rateio/:participantsId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItemRateioEntry(
    @Param('itemId') itemId: string,
    @Param('participantId') participantId: string,
  ) {
    await this.service.deleteItemRateioEntry(itemId, participantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comandas/:id/invite')
  @HttpCode(HttpStatus.CREATED)
  async createInvite(
    @Param('id') comandaId: string,
    @AuthUser() user: { id: string },
    @Body() dto: CreateInviteDto,
  ) {
    return this.service.createInvite(comandaId, user.id, dto);
  }

  @Get('invite/:code')
  async previewInvite(@Param('code') code: string) {
    return this.service.previewInvite(code);
  }

  @Post('invite/:code/accept')
  async acceptInvite(
    @Param('code') code: string,
    @AuthUser() user: { id: string } | undefined,
    @Body() dto: AcceptInviteDto,
    @Req() req: FastifyRequest,
  ) {
    const userId = (user as any)?.id;
    return this.service.acceptInvite(code, { userId, displayName: dto.displayName });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comandas/:id/invite/:code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvite(
    @Param('id') comandaId: string,
    @Param('code') code: string,
    @AuthUser() user: { id: string },
  ) {
    await this.service.revokeInvite(code, comandaId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('comandas/:id/invite/:code/qrcode.png')
  async qrcodePng(
    @Param('id') comandaId: string,
    @Param('code') code: string,
    @AuthUser() user: { id: string },
    @Res() reply: FastifyReply,
  ) {
    const inv = await this.service.previewInvite(code);
    if (inv.comanda.id !== comandaId) {
      reply.code(404).send({ message: 'Convite não encontrado' });
      return;
    }
    if (inv.status !== 'active') {
      reply.code(400).send({ message: 'Convite não está ativo' });
      return;
    }

    const url = `${process.env.APP_PUBLIC_URL?.replace(/\/$/, '')}/invite/${code}`;
    const pngBuffer = await QRCode.toBuffer(url, { type: 'png', margin: 1, scale: 6 });
    reply.header('Content-Type', 'image/png');
    reply.header('Cache-Control', 'no-store');
    reply.send(pngBuffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/close')
  async closeComanda(
    @Param('id') id: string,
    @AuthUser() user: { id: string },
    @Body() dto: CloseComandaDto,
    @Res() res: FastifyReply,
  ) {
    const summary = await this.service.closeComanda(id, user.id, dto);
    return res.status(200).send(summary);
  }

  @Get(':id/close/summary')
  async closingSummary(@Param('id') id: string) {
    return this.service.getClosingSummary(id);
  }
}
