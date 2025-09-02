import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CloseComandaDto, CloseSummary, RoundStrategy } from './dto/close-comanda.dto';

type CloseInputs = {
  serviceFeePct: Decimal;
  discountPct: Decimal;
  extras: Array<{ label: string; amount: Decimal }>;
};

@Injectable()
export class ClosingCalculator {
  resolveCloseInputs(
    dto: CloseComandaDto,
    comanda: { serviceFeePct?: any; discountPct?: any },
  ): CloseInputs {
    const serviceFeePct = new Decimal(dto.serviceFeePct ?? (comanda as any).serviceFeePct ?? 0);
    const discountPct = new Decimal(dto.discountPct ?? (comanda as any).discountPct ?? 0);
    const extras = (dto.extras ?? []).map((extra) => ({
      label: extra.label,
      amount: new Decimal(extra.amount),
    }));
    return { serviceFeePct, discountPct, extras } as const;
  }

  private buildParticipantSubtotals(totals: any) {
    const participantsLines = (totals.perParticipant as any[]).map((p) => ({
      participantId: p.participantId ?? p.id,
      name: p.name,
      subtotal: new Decimal(p.total),
    }));
    return participantsLines as Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
    }>;
  }

  private applyServiceFeeAndExtras(
    participantsLines: Array<{ participantId: string; name: string; subtotal: Decimal }>,
    serviceFeePct: Decimal,
    extras: Array<{ label: string; amount: Decimal }>,
  ) {
    const totalSubtotal = participantsLines.reduce(
      (acc, l) => acc.plus(l.subtotal),
      new Decimal(0),
    );
    const serviceFeeTotal = totalSubtotal.mul(serviceFeePct).div(100);
    const extrasTotal = extras.reduce((acc, e) => acc.plus(e.amount), new Decimal(0));

    return participantsLines.map((l) => {
      const weight = totalSubtotal.eq(0) ? new Decimal(0) : l.subtotal.div(totalSubtotal);
      const serviceFee = serviceFeeTotal.mul(weight);
      const extrasShare = extrasTotal.mul(weight);
      const gross = l.subtotal.plus(serviceFee).plus(extrasShare);
      return { ...l, serviceFee, extras: extrasShare, gross };
    }) as Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
      serviceFee: Decimal;
      extras: Decimal;
      gross: Decimal;
    }>;
  }

  private applyDiscount(
    linesWithFees: Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
      serviceFee: Decimal;
      extras: Decimal;
      gross: Decimal;
    }>,
    discountPct: Decimal,
  ) {
    const grossTotal = linesWithFees.reduce((acc, l) => acc.plus(l.gross), new Decimal(0));
    const discountTotal = grossTotal.mul(discountPct).div(100);

    return linesWithFees.map((l) => {
      const weight = grossTotal.eq(0) ? new Decimal(0) : l.gross.div(grossTotal);
      const discount = discountTotal.mul(weight);
      const total = l.gross.minus(discount);
      return { ...l, discount, total };
    }) as Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
      serviceFee: Decimal;
      extras: Decimal;
      gross: Decimal;
      discount: Decimal;
      total: Decimal;
    }>;
  }

  private applyRounding(
    linesWithDiscount: Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
      serviceFee: Decimal;
      extras: Decimal;
      gross: Decimal;
      discount: Decimal;
      total: Decimal;
    }>,
    strategy: RoundStrategy,
    roundTo: Decimal,
  ) {
    const round = (d: Decimal) =>
      d.div(roundTo).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(roundTo);

    let finalLines = linesWithDiscount.map((l) => ({ ...l, total: l.total }));
    if (strategy === RoundStrategy.PER_PERSON) {
      finalLines = finalLines.map((l) => ({ ...l, total: round(l.total) }));
    } else if (strategy === RoundStrategy.TOTAL) {
      const rawSum = finalLines.reduce((acc, l) => acc.plus(l.total), new Decimal(0));
      const target = round(rawSum);
      let temp = finalLines.map((l) => ({ ...l, total: round(l.total) }));
      const sumRounded = temp.reduce((acc, l) => acc.plus(l.total), new Decimal(0));
      const diff = target.minus(sumRounded);
      if (!diff.eq(0) && temp.length > 0) {
        const idx = temp.reduce((imax, l, i, arr) => (l.total.gt(arr[imax].total) ? i : imax), 0);
        temp[idx] = { ...temp[idx], total: temp[idx].total.plus(diff) };
      }
      finalLines = temp;
    }
    return finalLines;
  }

  private buildClosingSummary(
    comandaId: string,
    userId: string,
    serviceFeePct: Decimal,
    discountPct: Decimal,
    extras: Array<{ label: string; amount: Decimal }>,
    finalLines: Array<{
      participantId: string;
      name: string;
      subtotal: Decimal;
      serviceFee: Decimal;
      extras: Decimal;
      discount: Decimal;
      total: Decimal;
    }>,
  ): CloseSummary {
    const grandTotal = finalLines.reduce((acc, l) => acc.plus(l.total), new Decimal(0));
    return {
      comandaId,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closedById: userId,
      serviceFeePct: serviceFeePct.toFixed(2),
      discountPct: discountPct.toFixed(2),
      extras: extras.map((e) => ({ label: e.label, amount: e.amount.toFixed(2) })),
      lines: finalLines.map((l) => ({
        participantId: l.participantId,
        name: l.name,
        subtotal: l.subtotal.toFixed(2),
        serviceFee: l.serviceFee.toFixed(2),
        extras: l.extras.toFixed(2),
        discount: l.discount.toFixed(2),
        total: l.total.toFixed(2),
      })),
      grandTotal: grandTotal.toFixed(2),
    };
  }

  computeSummary(
    comandaId: string,
    userId: string,
    totals: any,
    inputs: CloseInputs,
    roundStrategy: RoundStrategy,
    roundTo: Decimal,
  ): CloseSummary {
    const participantsLines = this.buildParticipantSubtotals(totals);
    const linesWithFees = this.applyServiceFeeAndExtras(
      participantsLines,
      inputs.serviceFeePct,
      inputs.extras,
    );
    const linesWithDiscount = this.applyDiscount(linesWithFees, inputs.discountPct);
    const finalLines = this.applyRounding(linesWithDiscount, roundStrategy, roundTo);
    return this.buildClosingSummary(
      comandaId,
      userId,
      inputs.serviceFeePct,
      inputs.discountPct,
      inputs.extras,
      finalLines,
    );
  }
}

export type { CloseInputs };
