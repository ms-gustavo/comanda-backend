import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class ComandaRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
