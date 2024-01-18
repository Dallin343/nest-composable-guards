import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  Type,
  UseGuards,
} from "@nestjs/common";
import { Reflector, ModuleRef } from "@nestjs/core";
import {
  map,
  concat,
  forkJoin,
  from,
  Observable,
  of,
  switchMap,
  takeWhile,
} from "rxjs";
import { COMPOSABLE_GUARD_KEY } from "./constants";
import { Composition, isComposition, isType } from "./operators";

export function Compose(
  composition: Composition
): ClassDecorator & MethodDecorator {
  return SetMetadata(COMPOSABLE_GUARD_KEY, composition);
}

export function UseComposeGuard(
  composition: Composition
): ClassDecorator & MethodDecorator {
  return applyDecorators(Compose(composition), UseGuards(ComposableGuard));
}

@Injectable()
export class ComposableGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef
  ) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const composition = this.reflector.get<Composition>(
      COMPOSABLE_GUARD_KEY,
      context.getClass()
    );

    // Maps from type symbol to an instance of that type
    let guardInstances: Record<string, Promise<CanActivate>> = {};

    // let guardInstances: Promise<CanActivate>[] = [];
    composition.types.forEach((type) => {
      try {
        guardInstances[type.toString()] = this.moduleRef.get(type);
      } catch (err) {
        guardInstances[type.toString()] = this.moduleRef.create(type);
      }
    });

    // Wait for all guard instances to be retrieved or created
    return forkJoin(guardInstances).pipe(
      switchMap((guards) => this.process(composition, guards, context))
    );
  }

  process(
    composition: Composition,
    guards: Record<string, CanActivate>,
    context: ExecutionContext
  ): Observable<boolean> {
    switch (composition.op) {
      case 'all':
        return this.processAll(composition, guards, context);
      case 'any':
        return this.processAny(composition, guards, context);
      case 'oneof':
        return this.processOneOf(composition, guards, context);
      case 'not':
        return this.processNot(composition, guards, context);
    }
  }

  processAny(
    composition: Composition,
    guards: Record<string, CanActivate>,
    context: ExecutionContext
  ): Observable<boolean> {
    return concat(composition.terms).pipe(
      switchMap((term) => {
        if (isType(term)) {
          return this.deferGuard(guards[term.toString()], context);
        }
        return this.process(term, guards, context);
      }),
      takeWhile((termResult) => termResult !== true)
    );
  }

  processAll(
    composition: Composition,
    guards: Record<string, CanActivate>,
    context: ExecutionContext
  ): Observable<boolean> {
    return forkJoin(
      composition.terms.map((term) => {
        if (isType(term)) {
          return this.deferGuard(guards[term.toString()], context);
        }
        return this.process(term, guards, context);
      })
    ).pipe(map((results) => results.every((result) => result)));
  }

  processOneOf(
    composition: Composition,
    guards: Record<string, CanActivate>,
    context: ExecutionContext
  ): Observable<boolean> {
    return forkJoin(
      composition.terms.map((term) => {
        if (isType(term)) {
          return this.deferGuard(guards[term.toString()], context);
        }
        return this.process(term, guards, context);
      })
    ).pipe(map((results) => results.filter((result) => result).length === 1));
  }

  processNot(
    composition: Composition,
    guards: Record<string, CanActivate>,
    context: ExecutionContext
  ): Observable<boolean> {
    return of(true);
  }

  deferGuard(
    guard: CanActivate,
    context: ExecutionContext
  ): Observable<boolean> {
    const result = guard.canActivate(context);

    if (this.isPromise(result)) {
      return from(result);
    } else if (this.isObservable(result)) {
      return result;
    }
    return of(result);
  }

  isPromise(
    val: boolean | Promise<boolean> | Observable<boolean>
  ): val is Promise<boolean> {
    return (val as Promise<boolean>).then !== undefined;
  }

  isObservable(val: boolean | Observable<boolean>): val is Observable<boolean> {
    return (val as Observable<boolean>).pipe !== undefined;
  }
}
