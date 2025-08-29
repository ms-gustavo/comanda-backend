import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComandaRepository } from './comanda.repository';

type Role = 'owner' | 'participant' | 'all';

@Injectable()
export class ComandaService {
  constructor(private readonly repo: ComandaRepository) {}

  private toListResponse(
    rows: Array<{
      id: string;
      name: string;
      status: string;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      _count: {
        participants: number;
        items: number;
      };
    }>,
  ) {
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        ownerId: r.ownerId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        participantsCount: r._count.participants,
        itemsCount: r._count.items,
      })),
      nextCursor: rows.length > 0 ? rows[rows.length - 1].id : null,
      count: rows.length,
    };
  }

  async listMyComandas(
    userId: string,
    opts: {
      role: Role;
      status?: 'OPEN' | 'CLOSED';
      q?: string;
      cursor?: string;
      limit: number;
    },
  ) {
    const { role, status, q, cursor, limit } = opts;

    if (role === 'owner') {
      const rows = await this.repo.listByOwner({ ownerId: userId, status, q, cursor, limit });
      return this.toListResponse(rows);
    }
    if (role === 'participant') {
      const rows = await this.repo.listByParticipant({ userId, status, q, cursor, limit });
      return this.toListResponse(rows);
    }

    const [asOwner, asParticipant] = await Promise.all([
      this.repo.listByOwner({ ownerId: userId, status, q, cursor, limit }),
      this.repo.listByParticipant({ userId, status, q, cursor, limit }),
    ]);

    const seen = new Set<string>();
    const merged = [...asOwner, ...asParticipant].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    merged.sort((a, b) => {
      const t = +new Date(b.createdAt) - +new Date(a.createdAt);
      if (t !== 0) return t;
      return b.id.localeCompare(a.id);
    });

    return this.toListResponse(merged.slice(0, limit));
  }

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
