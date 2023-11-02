import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { from, Observable, of } from 'rxjs';
import { COMPOSABLE_GUARD_KEY } from './constants';

@Injectable()
export class ComposableGuard implements CanActivate {
    constructor(
        @Inject(Reflector) private readonly reflector: Reflector,
        @Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}

    
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    }

    deferGuard(guard: CanActivate, context: ExecutionContext): Observable<boolean> {
        const result = guard.canActivate(context);

        if (this.isPromise(result)) {
            return from(result);
        }
        else if (this.isObservable(result)) {
            return result;
        }
        return of(result);
    }

    isPromise(val: boolean | Promise<boolean> | Observable<boolean>): val is Promise<boolean> {
        return (val as Promise<boolean>).then !== undefined;
    }

    isObservable(val: boolean | Observable<boolean>): val is Observable<boolean> {
        return (val as Observable<boolean>).pipe !== undefined;
    }
    
}