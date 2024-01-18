import { CanActivate, Type } from "@nestjs/common";

type OpType = "any" | "all" | "oneof" | "not";

export type Composition = {
  op: OpType;
  terms: (Composition | Type<CanActivate>)[];
  types: Set<Type<CanActivate>>;
};

export type CompositionTerm = Composition | Type<CanActivate>;

export function isComposition(val: CompositionTerm): val is Composition {
  return (val as Composition).op !== undefined;
}

export function isType(val: CompositionTerm): val is Type<CanActivate> {
  return (val as Type<CanActivate>).call !== undefined;
}

function Operator(op: OpType, terms: CompositionTerm[]): Composition {
  let composed: Composition = {
    op,
    terms,
    types: new Set(),
  };

  for (let term of terms) {
    if (isComposition(term)) {
      term.types.forEach((type) => composed.types.add(type));
    } else if (isType(term)) {
      composed.types.add(term);
    }
  }
  return composed;
}

export function Any(...terms: CompositionTerm[]): Composition {
  return Operator("any", terms);
}

export function All(...terms: CompositionTerm[]): Composition {
  return Operator("all", terms);
}

export function OneOf(...terms: CompositionTerm[]): Composition {
  return Operator("oneof", terms);
}

export function Not(...terms: CompositionTerm[]) {
  return Operator("not", terms);
}
