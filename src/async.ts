type OnSuccess<R> = (result: R) => void;
type OnError = (err: Error) => void;
type Awaitable<R> = R | PromiseLike<R>;

export function wrapAsync<T0, R>(func: (arg0: T0) => Awaitable<R>): (arg0: T0, onSuccess?: OnSuccess<R>, onError?: OnError) => void;
export function wrapAsync<T0, T1, R>(func: (arg0: T0, arg1: T1) => Awaitable<R>): (arg0: T0, arg1: T1, onSuccess?: OnSuccess<R>, onError?: OnError) => void;
export function wrapAsync<T0, T1, T2, R>(func: (arg0: T0, arg1: T1, arg2: T2) => Awaitable<R>): (arg0: T0, arg1: T1, arg2: T2, onSuccess?: OnSuccess<R>, onError?: OnError) => void;
export function wrapAsync<T0, T1, T2, T3, R>(func: (arg0: T0, arg1: T1, arg2: T2, arg3: T3) => Awaitable<R>): (arg0: T0, arg1: T1, arg2: T2, arg3: T3, onSuccess?: OnSuccess<R>, onError?: OnError) => void;
export function wrapAsync(func: (...args: any[]) => Awaitable<any>): (...args: any[]) => void {
    return function (...args: any[]) {
        let i = args.length - 1;
        for (; i >= 0 && args[i] === undefined; i--) ;
        let callbacks: Function[] = [];
        for (let j = 0; j < 2 && i >= 0 && typeof args[i] === 'function'; i--, j++) ;
        let [onSuccess, onError] = args.slice(i, i + 2);
        return Promise.resolve().then(() => func.apply(this, args.slice(0, i))).then(onSuccess, onError);
    };
}

export function async<R>(target: Object, key: string, descriptor: TypedPropertyDescriptor<(arg0: any, onSuccess?: OnSuccess<R>, onError?: OnError) => Awaitable<R>>): void;
export function async<R>(target: Object, key: string, descriptor: TypedPropertyDescriptor<(arg0: any, arg1: any, onSuccess?: OnSuccess<R>, onError?: OnError) => Awaitable<R>>): void;
export function async<R>(target: Object, key: string, descriptor: TypedPropertyDescriptor<(arg0: any, arg1: any, arg2: any, onSuccess?: OnSuccess<R>, onError?: OnError) => Awaitable<R>>): void;
export function async<R>(target: Object, key: string, descriptor: TypedPropertyDescriptor<(arg0: any, arg1: any, arg2: any, arg3: any, onSuccess?: OnSuccess<R>, onError?: OnError) => Awaitable<R>>): void;
export function async<R>(target: Object, key: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => Awaitable<any>>) {
    descriptor.value = wrapAsync(descriptor.value);
}
