import { IU_DEPENDENCIES } from './iu-dependencies';

import type { IUDependencyGraph, ResolvedExecutionPlan } from '../shared/types';

const ALL_IUS: number[] = Object.keys(IU_DEPENDENCIES).map((key: string) =>
  Number.parseInt(key, 10)
);

export class DependencyResolver {
  private readonly graph: IUDependencyGraph;

  constructor() {
    this.graph = this.buildGraph();
  }

  getGraph(): IUDependencyGraph {
    return this.graph;
  }

  resolve(selected: readonly number[] | undefined): ResolvedExecutionPlan {
    const requested = selected && selected.length > 0 ? new Set(selected) : new Set(ALL_IUS);
    const expanded = new Set<number>();

    const visit = (iu: number): void => {
      if (expanded.has(iu)) {
        return;
      }
      expanded.add(iu);
      const deps = IU_DEPENDENCIES[iu] ?? [];
      for (const dep of deps) {
        visit(dep);
      }
    };

    for (const iu of requested) {
      visit(iu);
    }

    const order = this.topologicalSort();
    const orderedIUs = order.filter(iu => expanded.has(iu));

    return {
      orderedIUs,
      skippedIUs: ALL_IUS.filter(iu => !expanded.has(iu)),
    };
  }

  getDependencies(iu: number): readonly number[] {
    return IU_DEPENDENCIES[iu] ?? [];
  }

  private buildGraph(): IUDependencyGraph {
    const dependencies = new Map<number, readonly number[]>();
    const dependents = new Map<number, number[]>();

    for (const [rawIu, deps] of Object.entries(IU_DEPENDENCIES)) {
      const iu: number = Number.parseInt(rawIu, 10);
      dependencies.set(iu, deps);
      for (const dep of deps) {
        const list: number[] = dependents.get(dep) ?? [];
        list.push(iu);
        dependents.set(dep, list);
      }
    }

    const executionOrder: number[] = this.topologicalSort();
    return { dependencies, dependents, executionOrder };
  }

  private topologicalSort(): number[] {
    const inDegree = new Map<number, number>();
    const adjacency = new Map<number, number[]>();

    for (const iu of ALL_IUS) {
      inDegree.set(iu, 0);
      adjacency.set(iu, []);
    }

    for (const [rawIu, deps] of Object.entries(IU_DEPENDENCIES)) {
      const iu: number = Number.parseInt(rawIu, 10);
      for (const dep of deps) {
        inDegree.set(iu, (inDegree.get(iu) ?? 0) + 1);
        const list: number[] | undefined = adjacency.get(dep);
        if (list) {
          list.push(iu);
        }
      }
    }

    const queue: number[] = [];
    for (const [iu, count] of inDegree.entries()) {
      if (count === 0) {
        queue.push(iu);
      }
    }

    const result: number[] = [];
    while (queue.length > 0) {
      const current: number = queue.shift()!;
      result.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        const nextCount: number = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, nextCount);
        if (nextCount === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== ALL_IUS.length) {
      throw new Error('Circular dependency detected in IU graph');
    }

    return result;
  }
}
