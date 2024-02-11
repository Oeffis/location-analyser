import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";

export abstract class OsmTransformer {
    protected readonly relations: Map<number, Relation>;
    protected readonly ways: Map<number, Way>;
    protected readonly nodes: Map<number, Node>;

    public constructor(
        extraction: ExtractionResult
    ) {
        this.relations = extraction.relations;
        this.ways = extraction.ways;
        this.nodes = extraction.nodes;
    }

    protected getNodeOrThrow(nodeId: number): Node {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        return node;
    }
}
