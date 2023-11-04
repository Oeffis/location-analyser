// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getStatus(_location: [number, number]): Status {
    return {
        stops: [
            {
                id: "de:05513:6762:0:01",
                distance: 0.1
            }
        ]
    };
}

export interface Status {
    stops: {
        id: string;
        distance: number;
    }[];
}
