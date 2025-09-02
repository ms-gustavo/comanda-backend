import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { ComandaController } from './comanda.controller';
import { ComandaService } from './comanda.service';
import { ComandaRepository } from './comanda.repository';
import { AuthModule } from 'src/auth/auth.module';
import { ClosingCalculator } from './closing-calculator';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ComandaController],
  providers: [ComandaService, ComandaRepository, ClosingCalculator],
  exports: [ComandaService],
})
export class ComandaModule {}
