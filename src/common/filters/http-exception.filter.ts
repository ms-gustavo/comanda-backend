import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    // Defaults
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
        error = errorFromStatus(status);
      } else if (resp && typeof resp === 'object') {
        const r: any = resp;
        message = r.message ?? r.error ?? JSON.stringify(r);
        error = r.error ?? errorFromStatus(status);
      }
    } else if (isFastifyError(exception)) {
      const e = exception as any;
      status = typeof e.statusCode === 'number' ? e.statusCode : status;
      error = e.code === 'FST_ERR_RATE_LIMITED' ? 'Too Many Requests' : errorFromStatus(status);
      message =
        e.message || (e.code === 'FST_ERR_RATE_LIMITED' ? 'Too many requests' : 'Unexpected error');
    } else if (isPrismaUniqueError(exception)) {
      status = HttpStatus.CONFLICT;
      error = 'Conflict';
      message = 'Unique constraint violation';
    }

    const body = {
      statusCode: status,
      error: translateError(error),
      message: translateMessage(message),
      path: req?.url,
      method: req?.method,
      timestamp: new Date().toISOString(),
    };

    res.status(status).send(body);
  }
}

function isFastifyError(e: unknown) {
  return (
    typeof e === 'object' && e !== null && ('statusCode' in (e as any) || 'code' in (e as any))
  );
}
function isPrismaUniqueError(e: unknown) {
  return typeof e === 'object' && e !== null && (e as any).code === 'P2002';
}

function errorFromStatus(status: number) {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    default:
      return 'Internal Server Error';
  }
}

function translateError(err: string) {
  switch (err) {
    case 'Bad Request':
      return 'Requisição inválida';
    case 'Unauthorized':
      return 'Não autorizado';
    case 'Forbidden':
      return 'Proibido';
    case 'Not Found':
      return 'Não encontrado';
    case 'Conflict':
      return 'Conflito';
    case 'Unprocessable Entity':
      return 'Entidade não processável';
    case 'Too Many Requests':
      return 'Muitas requisições';
    case 'Internal Server Error':
    default:
      return 'Erro interno do servidor';
  }
}

function translateMessage(msg: any) {
  if (typeof msg !== 'string') return msg;
  if (msg.startsWith('Rate limit exceeded')) {
    const match = msg.match(/retry in (.*)/i);
    if (match && match[1]) {
      return `Limite de requisições excedido, tente novamente em ${match[1]}`;
    }
    return 'Limite de requisições excedido';
  }

  if (msg === 'Too many requests') return 'Muitas requisições';
  if (msg === 'Unexpected error') return 'Erro inesperado';

  return msg;
}
