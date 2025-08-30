import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComandaRepository } from './comanda.repository';
import { PrismaService } from '@prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

type Role = 'owner' | 'participant' | 'all';

@Injectable()
export class ComandaService {
  constructor(
    private readonly repo: ComandaRepository,
    private readonly prisma: PrismaService,
  ) {}

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

  private async validateRateioContext(
    itemId: string,
    entries: Array<{ participantId: string; percentage: number }>,
  ) {
    const item = await this.prisma.item.findUnique({
      where: {
        id: itemId,
      },
      select: { id: true, comandaId: true },
    });

    if (!item) throw new NotFoundException(`Item não encontrado`);

    if (entries.length === 0) throw new BadRequestException(`Rateio vazio`);

    const sum = entries.reduce((acc, e) => acc + e.percentage, 0);
    if (Math.abs(sum - 100) > 0.01)
      throw new BadRequestException(`Soma do rateio deve ser 100. Recebido: ${sum.toFixed(2)}`);

    const participantsIds = entries.map((e) => e.participantId);
    const participants = await this.prisma.participant.findMany({
      where: { id: { in: participantsIds }, comandaId: item.comandaId },
      select: { id: true },
    });

    const validSet = new Set(participants.map((p) => p.id));
    const invalid = participantsIds.filter((id) => !validSet.has(id));
    if (invalid.length)
      throw new BadRequestException(
        `Participantes inválidos para o item/comanda: ${invalid.join(',')}`,
      );

    return item;
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
    const items = await this.repo.listItems(comandaId);

    const map = new Map<string, { name: string; total: any }>();
    for (const p of snap.participants) {
      map.set(p.id, { name: p.name, total: new (Decimal as any)(0) });
    }
    let unassigned = new (Decimal as any)(0);
    let grand = new (Decimal as any)(0);

    const rateios = await this.prisma.rateioEntry.findMany({
      where: { itemId: { in: items.map((i) => i.id) } },
      select: { itemId: true, participantId: true, percentage: true },
    });
    const rateioByItem = new Map<string, { participantId: string; percentage: any }[]>();
    for (const r of rateios) {
      const arr = rateioByItem.get(r.itemId) ?? [];
      arr.push({ participantId: r.participantId, percentage: r.percentage as any });
      rateioByItem.set(r.itemId, arr);
    }

    for (const it of items) {
      const line = (it.price as any).mul(it.quantity);
      grand = (grand as any).add(line);

      const splits = rateioByItem.get(it.id);
      if (splits && splits.length > 0) {
        for (const s of splits) {
          const fraction = (s.percentage as any).div(100);
          const portion = (line as any).mul(fraction);
          const bucket = map.get(s.participantId);
          if (bucket) bucket.total = (bucket.total as any).add(portion);
        }
      } else if (it.assignedToId && map.has(it.assignedToId)) {
        const bucket = map.get(it.assignedToId)!;
        bucket.total = (bucket.total as any).add(line);
      } else {
        unassigned = (unassigned as any).add(line);
      }
    }

    const perParticipant = Array.from(map.entries()).map(([participantId, v]) => ({
      participantId,
      name: v.name,
      total: (v.total as any).toFixed(2),
    }));

    return {
      perParticipant,
      unassignedTotal: (unassigned as any).toFixed(2),
      grandTotal: (grand as any).toFixed(2),
      participantsCount: snap.participants.length,
      itemsCount: items.length,
    };
  }

  async listItems(comandaId: string) {
    const comanda = await this.repo.findSnapshotById(comandaId);
    if (!comanda) throw new NotFoundException(`Comanda não encontrada`);

    return this.repo.listItems(comandaId);
  }

  async addItems(
    comandaId: string,
    dto: {
      name: string;
      price: string;
      quantity: number;
      note?: string;
      assignedToId?: string;
    },
  ) {
    if (dto.assignedToId) {
      const snap = await this.repo.findSnapshotById(comandaId);
      if (!snap) throw new NotFoundException(`Comanda não encontrada`);

      const exists = snap.participants.some((p) => p.id === dto.assignedToId);
      if (!exists) throw new BadRequestException(`Participante não encontrado`);
    }

    return this.repo.createItem(comandaId, dto);
  }

  async updateItem(
    itemId: string,
    dto: {
      name?: string;
      price?: string;
      quantity?: number;
      note?: string;
      assignedToId?: string | null;
    },
  ) {
    if (dto.assignedToId !== undefined) {
      const item = await this.prisma.item.findUnique({
        where: { id: itemId },
        select: { comandaId: true },
      });
      if (!item) throw new NotFoundException('Item não encontrado');
      if (dto.assignedToId) {
        const snap = await this.repo.findSnapshotById(item.comandaId);
        if (!snap) throw new NotFoundException('Comanda não encontrada');
        const exists = snap.participants.some((p) => p.id === dto.assignedToId);
        if (!exists) throw new BadRequestException('Participante não encontrado');
      }
    }
    return this.repo.updateItem(itemId, dto);
  }

  async removeItem(itemId: string) {
    await this.repo.deleteItem(itemId);
  }

  async getItemRateio(itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) throw new NotFoundException('Item não encontrado');

    const entries = await this.repo.listRateio(itemId);
    return entries.map((e) => ({
      participantId: e.participantId,
      percentage: (e.percentage as any).toFixed(2),
    }));
  }

  async putItemRateio(
    itemId: string,
    entries: Array<{ participantId: string; percentage: number }>,
  ) {
    await this.validateRateioContext(itemId, entries);
    await this.repo.replaceRateio(itemId, entries);
    return this.getItemRateio(itemId);
  }

  async deleteItemRateioEntry(itemId: string, participantId: string) {
    const found = await this.prisma.rateioEntry.findUnique({
      where: { itemId_participantId: { itemId, participantId } },
      select: { itemId: true },
    });
    if (!found) throw new NotFoundException('Rateio não encontrado');
    await this.repo.deleteOneRateio(itemId, participantId);
  }
}
