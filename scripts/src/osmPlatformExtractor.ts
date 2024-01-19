import { Node, OsmExtractor, Relation, Way, isNode, isRelation, isWay } from "./osmExtractor";

export class OsmPlatformExtractor extends OsmExtractor {
    protected async getRelations(relationIds?: number[]): Promise<Map<number, Relation>> {
        const relations = new Map<number, Relation>();

        const baseFilter = (relation: Relation): boolean => relation.tags?.public_transport === "platform";
        let filter = baseFilter;

        if (relationIds) {
            const relationIdsToKeep = new Set(relationIds);
            filter = relation => relationIdsToKeep.has(relation.id)
                && baseFilter(relation);
        }

        await this.filterStream({
            typeGuard: isRelation,
            filter,
            onMatch: relation => void relations.set(relation.id, relation)
        });

        return relations;
    }

    protected getWayIds(relations: Map<number, Relation>): Set<number> {
        const wayIds = new Set<number>();
        relations.forEach(relation => {
            const ways = relation
                .members
                .filter(
                    member => member.type === "way"
                        && member.role === "outer"
                )
                .map(member => member.ref);
            ways.forEach(way => wayIds.add(way));
        });
        return wayIds;
    }

    protected async getWays(wayIdsToKeep: Set<number>): Promise<Map<number, Way>> {
        const ways = new Map<number, Way>();

        await this.filterStream({
            typeGuard: isWay,
            filter: way => wayIdsToKeep.has(way.id) || way.tags?.public_transport === "platform",
            onMatch: way => void ways.set(way.id, way)
        });

        return ways;
    }

    protected async getNodes(nodeIdsToKeep: Set<number>): Promise<Map<number, Node>> {
        const nodes = new Map<number, Node>();

        await this.filterStream({
            typeGuard: isNode,
            filter: node => nodeIdsToKeep.has(node.id) || node.tags?.public_transport === "platform",
            onMatch: node => void nodes.set(node.id, node)
        });

        return nodes;
    }
}
