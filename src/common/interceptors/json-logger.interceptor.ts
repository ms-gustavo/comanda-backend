import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class JsonLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req: any = context.switchToHttp().getRequest();
    const method = req?.method;
    const url = req?.url;
    const ip = req?.ip || req?.headers?.['x-forwarded-for'];
    const userAgent = req?.headers?.['user-agent'];

    return next.handle().pipe(
      tap((_data: unknown) => {
        const ms = Date.now() - now;
        const statusCode = context.switchToHttp().getResponse()?.statusCode || 200;
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'http_request',
            method,
            url,
            statusCode,
            durationMs: ms,
            ip,
            userAgent,
          }),
        );
      }),
    );
  }
}
