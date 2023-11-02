import { CanActivate, Type } from "@nestjs/common";

export type Composed = {
    operator: 'or' | 'and' | 'xor' | 'not'
    terms: (Composed | Type<CanActivate>)[]
}

export type CompositionTerm = 
    Type<CanActivate> | ((...args: CompositionTerm[]) => Composed);

export function Or(...terms: CompositionTerm[]): Composed {
    let composed: Composed = {
        operator: 'or',
        terms: []
    };

    for (let term of terms) {
        
    }

    return composed;
}

export function And(...terms: CompositionTerm[]) {

}

export function Xor(...terms: CompositionTerm[]) {

}

export function Not(...terms: CompositionTerm[]) {

}
