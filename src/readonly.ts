export function readonly<T>(target: T, key: string) {
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        set(this: T, value: any) {
            Object.defineProperty(this, key, {
                configurable: false,
                value
            });
        }
    });
}
