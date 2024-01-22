import { Relation, Way } from "./osmExtractor";

export class PlatformBoundarySorter {
    private remainingWays: Way[];

    public constructor(
        private readonly relation: Relation,
        private readonly ways: Map<number, Way>
    ) {
        this.remainingWays = this.getWaysInRelation();
    }

    private getWaysInRelation(): Way[] {
        const waysInRelation = this.relation
            .members
            .filter(member => member.type === "way" && member.role === "outer")
            .map(member => member.ref)
            .map(wayId => this.ways.get(wayId));

        if (waysInRelation.some(way => !way))
            throw new Error(`Relation ${this.relation.tags?.name} has missing ways`);

        return waysInRelation as Way[];
    }

    public getConsecutiveSections(): number[][] {
        const consecutiveSections = [];

        for (let startNodeId = this.getStartNodeIdOfConsecutiveSection(); startNodeId !== undefined; startNodeId = this.getStartNodeIdOfConsecutiveSection()) {
            consecutiveSections.push([startNodeId, ...this.getNodesFollowing(startNodeId)]);
        }

        if (consecutiveSections.length === 0) {
            console.warn(`Relation ${this.relation.tags?.name}(${this.relation.id}) has not a single section`);
        }

        return consecutiveSections;
    }

    private getStartNodeIdOfConsecutiveSection(): number | undefined {
        return this.remainingWays[0]?.refs?.[0];
    }

    private getNodesFollowing(startNodeId: number): number[] {
        const nodeIds = [];

        let currentWay = this.findWayFollowing(startNodeId);
        while (currentWay !== undefined) {
            this.removeFromRemaining(currentWay);
            const nodes = currentWay.refs ?? [];
            if (nodes[0] === startNodeId) {
                nodeIds.push(...nodes.slice(1));
                startNodeId = nodes[nodes.length - 1] ?? startNodeId;
            } else {
                nodeIds.push(...nodes.slice(0, -1).reverse());
                startNodeId = nodes[0] ?? startNodeId;
            }

            currentWay = this.findWayFollowing(startNodeId);
        }

        return nodeIds;
    }

    private removeFromRemaining(way: Way): void {
        const find = this.remainingWays.findIndex(remainingWay => remainingWay.id === way.id);
        this.remainingWays.splice(find, 1);
    }

    private findWayFollowing(nodeId: number): Way | undefined {
        return this.remainingWays.find(way => way.refs?.[0] === nodeId || way.refs?.[way.refs.length - 1] === nodeId);
    }
}
