import { Relation, Way } from "./osmExtractor";

export class RouteSorter {
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
            .filter(member => member.type === "way" && member.role === "")
            .map(member => member.ref)
            .map(wayId => this.ways.get(wayId));

        if (waysInRelation.some(way => !way))
            throw new Error(`Relation ${this.relation.tags.name} has missing ways`);

        return waysInRelation as Way[];
    }

    public getConsecutiveSections(): number[][] {
        const consecutiveSections = [];

        for (let startNodeId = this.getStartNodeIdOfConsecutiveSection(); startNodeId !== undefined; startNodeId = this.getStartNodeIdOfConsecutiveSection()) {
            consecutiveSections.push([startNodeId, ...this.getNodesFollowing(startNodeId)]);
        }

        if (consecutiveSections.length === 0) {
            console.warn(`Relation ${this.relation.tags.name}(${this.relation.id}) has not a single section`);
        }

        return consecutiveSections;
    }

    private getStartNodeIdOfConsecutiveSection(): number | undefined {
        while (this.remainingWays.length > 0) {
            const startNodeId = this.getStartNodeIdOrUndefined();
            if (startNodeId !== undefined) return startNodeId;
            console.warn(`Relation ${this.relation.tags.name}(${this.relation.id}) has a way that is not connected to any other way`);
            this.remainingWays.shift();
        }
    }

    private getStartNodeIdOrUndefined(): number | undefined {
        try {
            return this.getStartNodeIdOrThrow();
        } catch (e) {
            return undefined;
        }
    }

    private getStartNodeIdOrThrow(): number {
        const firstWay = this.remainingWays[0];
        if (!firstWay) throw new Error(`Relation ${this.relation.tags.name} has no ways`);

        const startNodeId = firstWay.refs?.[0];
        const endNodeId = firstWay.refs?.[firstWay.refs.length - 1];
        if (!startNodeId) throw new Error(`No start Node`);
        if (!endNodeId) throw new Error(`No end Node`);

        const nonFirstWays = this.remainingWays.slice(1);
        const startFoundInOthers = nonFirstWays.find(way => way.refs?.includes(startNodeId));
        const endFoundInOthers = nonFirstWays.find(way => way.refs?.includes(endNodeId));

        const endIsStart = startFoundInOthers && !endFoundInOthers;
        if (!endFoundInOthers && !startFoundInOthers) throw new Error(`Start node ${startNodeId} not found in any other way`);
        return endIsStart ? endNodeId : startNodeId;
    }

    private getNodesFollowing(startNodeId: number): number[] {
        const nodeIds = [];

        let currentWay = this.findWayIntersecting([startNodeId]);
        while (currentWay !== undefined) {
            this.removeFromRemaining(currentWay);
            const nodes = currentWay.refs ?? [];
            const nextWay = this.findWayIntersecting(nodes);
            if (nextWay) {
                const startNodeIndex = nodes.indexOf(startNodeId);
                const commonNodeIdIndex = nodes.findIndex(nodeId => nextWay.refs?.includes(nodeId));

                let wayNodeIds: number[];
                if (commonNodeIdIndex >= startNodeIndex) {
                    wayNodeIds = nodes.slice(startNodeIndex, commonNodeIdIndex + 1);
                } else {
                    wayNodeIds = nodes.slice(commonNodeIdIndex, startNodeIndex + 1).reverse();
                }

                const nodesToPrint = wayNodeIds.slice(1);
                nodeIds.push(...nodesToPrint);
                startNodeId = nodesToPrint[nodesToPrint.length - 1] ?? startNodeId;
            } else {
                if (nodes[0] === startNodeId) {
                    nodeIds.push(...nodes.slice(1));
                } else {
                    nodeIds.push(...nodes.slice(0, -1).reverse());
                }
            }

            currentWay = nextWay;
        }

        return nodeIds;
    }

    private removeFromRemaining(way: Way): void {
        const find = this.remainingWays.findIndex(remainingWay => remainingWay.id === way.id);
        this.remainingWays.splice(find, 1);
    }

    private findWayIntersecting(nodeIds: number[]): Way | undefined {
        return this.remainingWays.find(way => nodeIds.some(nodeId => way.refs?.includes(nodeId)));
    }
}
