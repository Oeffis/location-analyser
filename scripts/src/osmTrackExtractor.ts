import { Node, OsmExtractor, Relation, Way, isNode, isRelation, isWay } from "./osmExtractor";

export class OsmTrackExtractor extends OsmExtractor {
    private readonly routeTypes = [
        "bus",
        "trolleybus",
        "minibus",
        "share_taxi",
        "train",
        "light_rail",
        "subway",
        "tram",
        "monorail",
        "ferry",
        "funicular"
    ];

    protected async getRelations(relationIds?: number[]): Promise<Map<number, Relation>> {
        const relations = new Map<number, Relation>();

        const baseFilter = (relation: Relation): boolean => relation.tags?.type === "route"
            && this.routeTypes.includes(relation.tags.route ?? "");
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
                        && member.role === ""
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
            filter: way => wayIdsToKeep.has(way.id),
            onMatch: way => void ways.set(way.id, way)
        });

        return ways;
    }

    protected async getNodes(nodeIdsToKeep: Set<number>): Promise<Map<number, Node>> {
        const nodes = new Map<number, Node>();

        await this.filterStream({
            typeGuard: isNode,
            filter: node => nodeIdsToKeep.has(node.id),
            onMatch: node => void nodes.set(node.id, node)
        });

        return nodes;
    }
}
