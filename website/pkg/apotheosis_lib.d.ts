/* tslint:disable */
/* eslint-disable */

export class ApotheosisSolverRS {
    free(): void;
    [Symbol.dispose](): void;
    cost_batch(ids: Int32Array, counts: Int32Array, sample_sizes: Uint32Array, target_id: number): CostBatchResultRS;
    /**
     * Requires deduplicated items
     */
    fuse_batch(ids: Int32Array, counts: Int32Array, sample_sizes: Uint32Array): FuseBatchResultRS;
    constructor(property_weights: Float64Array, tag_magnitude: number, color_weight: number, samey_punishment: number, ids: Int32Array, stack_sizes: Int32Array, energies: Float64Array, biases: Float64Array, flattened_mood_vectors: Float64Array, flattened_color_vectors: Float64Array, tag_bitsets: Uint32Array, output_tag_bitsets: Uint32Array, fuseable_ids: Int32Array);
}

export class CostBatchResultRS {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    costs: Float64Array;
    counts: Int32Array;
    ids: Int32Array;
}

export class FuseBatchResultRS {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    counts: Int32Array;
    ids: Int32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_apotheosissolverrs_free: (a: number, b: number) => void;
    readonly __wbg_costbatchresultrs_free: (a: number, b: number) => void;
    readonly __wbg_fusebatchresultrs_free: (a: number, b: number) => void;
    readonly __wbg_get_costbatchresultrs_costs: (a: number) => [number, number];
    readonly __wbg_get_costbatchresultrs_counts: (a: number) => [number, number];
    readonly __wbg_get_costbatchresultrs_ids: (a: number) => [number, number];
    readonly __wbg_set_costbatchresultrs_costs: (a: number, b: number, c: number) => void;
    readonly __wbg_set_costbatchresultrs_counts: (a: number, b: number, c: number) => void;
    readonly __wbg_set_costbatchresultrs_ids: (a: number, b: number, c: number) => void;
    readonly apotheosissolverrs_cost_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly apotheosissolverrs_fuse_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly apotheosissolverrs_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number, s: number, t: number, u: number, v: number, w: number) => [number, number, number];
    readonly __wbg_set_fusebatchresultrs_counts: (a: number, b: number, c: number) => void;
    readonly __wbg_set_fusebatchresultrs_ids: (a: number, b: number, c: number) => void;
    readonly __wbg_get_fusebatchresultrs_counts: (a: number) => [number, number];
    readonly __wbg_get_fusebatchresultrs_ids: (a: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
