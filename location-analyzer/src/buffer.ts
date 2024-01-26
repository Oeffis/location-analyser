export class Buffer<C> extends Array<C> {
    constructor(private readonly capacity: number) {
        super();
    }

    public push(...items: C[]): number {
        const newLength = super.push(...items);
        if (newLength > this.capacity) {
            this.splice(0, newLength - this.capacity);
        }

        return newLength;
    }
}
