import { Observable, Observer, Subscriber, Subscription, SubscriptionLike, from, of } from "rxjs";
import { AnonymousSubject } from "rxjs/internal/Subject";


export class FunctionSubject<TInput, TOutput> extends Observable<TOutput> implements SubscriptionLike {
    /** @internal */
    _closed = false;

    /**
     * Will return true if this subject has been closed and is no longer accepting new values.
     */
    get closed() {
        return this._closed;
    }

    private _observerCounter = 0;
    private currentObservers = new Map<number, Observer<TOutput>>();

    /**
     * This is used to track a known array of observers, so we don't have to
     * clone them while iterating to prevent reentrant behaviors.
     * (for example, what if the subject is subscribed to when nexting to an observer)
     */
    private observerSnapshot: Observer<TOutput>[] | undefined;

    /** @internal */
    get observers(): Observer<TOutput>[] {
        return (this.observerSnapshot ??= Array.from(this.currentObservers.values()));
    }

    /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
    hasError = false;

    /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
    thrownError: any = null;

    /**
     * Creates a "subject" by basically gluing an observer to an observable.
     *
     * @deprecated Recommended you do not use. Will be removed at some point in the future. Plans for replacement still under discussion.
     */
    static create: (...args: any[]) => any = <TOutput>(destination: Observer<TOutput>, source: Observable<TOutput>): AnonymousSubject<TOutput> => {
        return new AnonymousSubject<TOutput>(destination, source);
    };

    private _middleware: (input: TInput) => TOutput | Promise<TOutput> | Observable<TOutput>;

    constructor(middleware: (input: TInput) => TOutput | Promise<TOutput> | Observable<TOutput>) {
        // NOTE: This must be here to obscure Observable's constructor.
        super();
        this._middleware = middleware;
    }

    protected _clearObservers() {
        this.currentObservers.clear();
        this.observerSnapshot = undefined;
    }

    private handleResponse(value: TOutput | Promise<TOutput> | Observable<TOutput>): Observable<TOutput> {
        if (value instanceof Observable) return value
        if (value instanceof Promise) return from(value)
        return of(value)
    }

    next(value: TInput) {
        if (!this._closed) {

            const { observers } = this;
            const len = observers.length;

            try {
                const handled = this.handleResponse(this._middleware(value))
                for (let i = 0; i < len; i++) {
                    handled.subscribe({
                        next: (output: TOutput) => observers[i]!.next(output),
                        error: (err: any) => observers[i]!.error(err),
                        complete: () => console.log('Hanlded completed')
                    })
                }
            } catch (error) {
                for (let i = 0; i < len; i++) {
                    observers[i]!.error(error)
                }
            }

        }
    }

    error(err: any) {
        if (!this._closed) {
            this.hasError = this._closed = true;
            this.thrownError = err;
            const { observers } = this;
            const len = observers.length;
            for (let i = 0; i < len; i++) {
                observers[i]!.error(err);
            }
            this._clearObservers();
        }
    }

    complete() {
        if (!this._closed) {
            this._closed = true;
            const { observers } = this;
            const len = observers.length;
            for (let i = 0; i < len; i++) {
                observers[i]!.complete();
            }
            this._clearObservers();
        }
    }

    unsubscribe() {
        this._closed = true;
        this._clearObservers();
    }

    get observed() {
        return this.currentObservers.size > 0;
    }

    /** @internal */
    protected _subscribe(subscriber: Subscriber<TOutput>): Subscription {
        this._checkFinalizedStatuses(subscriber);
        return this._innerSubscribe(subscriber);
    }

    /** @internal */
    protected _innerSubscribe(subscriber: Subscriber<any>) {
        if (this.hasError || this._closed) {
            return Subscription.EMPTY;
        }
        const { currentObservers } = this;

        const observerId = this._observerCounter++;
        currentObservers.set(observerId, subscriber);
        this.observerSnapshot = undefined;
        subscriber.add(() => {
            currentObservers.delete(observerId);
            this.observerSnapshot = undefined;
        });
        return subscriber;
    }

    /** @internal */
    protected _checkFinalizedStatuses(subscriber: Subscriber<any>) {
        const { hasError, thrownError, _closed } = this;
        if (hasError) {
            subscriber.error(thrownError);
        } else if (_closed) {
            subscriber.complete();
        }
    }

    /**
     * Creates a new Observable with this Subject as the source. You can do this
     * to create custom Observer-side logic of the Subject and conceal it from
     * code that uses the Observable.
     * @return Observable that this Subject casts to.
     */
    asObservable(): Observable<TOutput> {
        return new Observable((subscriber) => this.subscribe(subscriber));
    }
}