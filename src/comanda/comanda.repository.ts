import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class ComandaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly baseSelect = {
    id: true,
    name: true,
    status: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        participants: true,
        items: true,
      },
    },
  } satisfies Prisma.ComandaSelect;

  async listByOwner(params: {
    ownerId: string;
    status?: 'OPEN' | 'CLOSED';
    q?: string;
    cursor?: string;
    limit: number;
  }) {
    const where: Prisma.ComandaWhereInput = {
      ownerId: params.ownerId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' } } : {}),
    };

    return this.prisma.comanda.findMany({
      where,
      select: this.baseSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      take: params.limit,
    });
  }

  async listByParticipant(params: {
    userId: string;
    status?: 'OPEN' | 'CLOSED';
    q?: string;
    cursor?: string;
    limit: number;
  }) {
    const where: Prisma.ComandaWhereInput = {
      participants: { some: { userId: params.userId } },
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' } } : {}),
    };

    return this.prisma.comanda.findMany({
      where,
      select: this.baseSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      take: params.limit,
    });
  }

  async createComandaWithParticipants(params: {
    name: string;
    ownerId: string;
    participantsNames?: string[];
  }) {
    const { name, ownerId, participantsNames } = params;

    return this.prisma.$transaction(async (tx) => {
      const comanda = await tx.comanda.create({
        data: {
          name,
          ownerId,
          status: 'OPEN',
        },
      });

      if (participantsNames && participantsNames.length > 0) {
        const uniqueNames = Array.from(
          new Set(participantsNames.map((n) => n.trim()).filter((n) => n.length > 0)),
        );

        if (uniqueNames.length > 0) {
          await tx.participant.createMany({
            data: uniqueNames.map((name) => ({
              name,
              comandaId: comanda.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      const count = await tx.participant.count({ where: { comandaId: comanda.id } });
      return { comanda, participantsCount: count };
    });
  }

  async findSnapshotById(comandaId: string) {
    return this.prisma.comanda.findUnique({
      where: { id: comandaId },
      include: {
        participants: {
          orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, userId: true, createdAt: true, updatedAt: true },
        },
      },
    });
  }

  async listItems(comandaId: string) {
    return this.prisma.item.findMany({
      where: { comandaId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        note: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createItem(
    comandaId: string,
    data: {
      name: string;
      price: string;
      quantity: number;
      note?: string;
      assignedToId?: string;
    },
  ) {
    return this.prisma.item.create({
      data: {
        comandaId,
        name: data.name,
        price: new (Decimal as any)(data.price),
        quantity: data.quantity,
        note: data.note,
        assignedToId: data.assignedToId ?? null,
      },
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        note: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateItem(
    itemId: string,
    data: {
      name?: string;
      price?: string;
      quantity?: number;
      note?: string;
      assignedToId?: string | null;
    },
  ) {
    const payload: any = { ...data };
    if (data.price !== undefined) payload.price = new (Decimal as any)(data.price);
    return this.prisma.item.update({
      where: { id: itemId },
      data: payload,
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        note: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteItem(itemId: string) {
    await this.prisma.item.delete({ where: { id: itemId } });
  }

  async listRateio(itemId: string) {
    return this.prisma.rateioEntry.findMany({
      where: { itemId },
      orderBy: [{ createdAt: 'asc' }],
      select: { participantId: true, percentage: true, createdAt: true, updatedAt: true },
    });
  }

  async replaceRateio(
    itemId: string,
    entries: Array<{ participantId: string; percentage: number }>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rateioEntry.deleteMany({ where: { itemId } });
      await tx.rateioEntry.createMany({
        data: entries.map((e) => ({
          itemId,
          participantId: e.participantId,
          percentage: new (Decimal as any)(e.percentage.toFixed(2)),
        })),
      });
    });
  }

  async deleteOneRateio(itemId: string, participantId: string) {
    await this.prisma.rateioEntry.delete({
      where: { itemId_participantId: { itemId, participantId } },
    });
  }
}
