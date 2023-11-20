# FunctionSubject Library
## Overview
The FunctionSubject library introduces the FunctionSubject class, aiming to address the bidirectional data flow limitations in scenarios where both data consumption and emission capabilities are needed. This enhancement allows for internal data transformations, enabling the sharing of the subject across different parts of the codebase while maintaining bidirectional data flow.

## Problem Statement
The current approach in RxJS restricts bidirectional data flow when using Subjects and applying transformations through operators like switchMap. This limitation becomes apparent in scenarios where components or code segments require both data consumption and emission capabilities.

## Proposal
The proposed solution extends the functionality of Subjects by introducing a middleware function during the creation of the FunctionSubject. This middleware function enables custom transformations, providing the ability to emit and receive values bidirectionally. The FunctionSubject simplifies code by eliminating the need for additional Observables in scenarios requiring bidirectional data flow.

## Example Usage
```typescript

// Without FunctionSubject

const mySubject = new Subject<number>();

// ...

const myObservable = mySubject.pipe(
    switchMap(n => `Number: ${n}`)
);

// ...

myObservable.next(2); // Next method lost!!!

// With FunctionSubject

const myFunctionSubject = new FunctionSubject((n: number) => `Number: ${n}`);

myFunctionSubject.subscribe({
    next: (text: string) => console.log(text),
    error: error => console.error(error),
    complete: () => console.info('My FunctionSubject is completed!')
});

myFunctionSubject.next(1); // Output: 'Number: 1'

```
## API Reference

### `FunctionSubject<TInput, TOutput>`

- `constructor(middleware: (input: TInput) => TOutput | Promise<TOutput> | Observable<TOutput>)`: Creates a `FunctionSubject` with the specified middleware function.

- `next(value: TInput)`: Emits a new value bidirectionally.

- `subscribe(observer: Observer<TOutput>): Subscription`: Subscribes an observer to the `FunctionSubject`.

- `asObservable(): Observable<TOutput>`: Converts the `FunctionSubject` into an Observable.

- `unsubscribe()`: Unsubscribes all observers from the `FunctionSubject`.

- `observed`: Returns `true` if the `FunctionSubject` has active observers.

## Conclusion

The `FunctionSubject` library provides a versatile solution for scenarios requiring bidirectional data flow, simplifying code and improving flexibility. Your feedback and contributions to this proposal are highly appreciated. Thank you for considering the FunctionSubject library!
