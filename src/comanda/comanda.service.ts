import { BadRequestException, Injectable } from '@nestjs/common';
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
}
