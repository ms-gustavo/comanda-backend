import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComandaRepository } from './comanda.repository';

@Injectable()
export class ComandaService {
  constructor(private readonly repo: ComandaRepository) {}

  async createComanda(ownerId: string, name: string, participantsNames?: string[]) {
    if (!ownerId) throw new BadRequestException(`OwnerID ausente`);
    if (!name) throw new BadRequestException(`Nome da comanda ausente`);

    return this.repo.createComandaWithParticipants({
      name,
      ownerId,
      participantsNames,
    });
  }

  async getSnapshot(comandaId: string) {
    const found = await this.repo.findSnapshotById(comandaId);
    if (!found) throw new NotFoundException(`Comanda não encontrada`);

    const payload = {
      id: found.id,
      name: found.name,
      status: found.status,
      ownerId: found.ownerId,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
      participants: found.participants.map((p) => ({
        id: p.id,
        name: p.name,
        userId: p.userId ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };

    return payload;
  }

  async getTotals(comandaId: string) {
    const snap = await this.getSnapshot(comandaId);
    const perParticipant = snap.participants.map((p) => ({
      participantId: p.id,
      name: p.name,
      total: 0,
    }));
    const grandTotal = 0;

    return { perParticipant, grandTotal, participantsCount: snap.participants.length };
  }
}
