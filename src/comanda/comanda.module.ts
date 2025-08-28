import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { ComandaController } from './comanda.controller';
import { ComandaService } from './comanda.service';
import { ComandaRepository } from './comanda.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ComandaController],
  providers: [ComandaService, ComandaRepository],
  exports: [ComandaService],
})
export class ComandaModule {}
