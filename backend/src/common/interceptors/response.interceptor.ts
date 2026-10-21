import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WrappedResponse<T> { success: boolean; data: T; message?: string; }

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, WrappedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<WrappedResponse<T>> {
    return next.handle().pipe(map(data => {
      if (data && typeof data === 'object' && 'success' in (data as any)) return data as any;
      return { success: true, data, message: 'OK' };
    }));
  }
}
