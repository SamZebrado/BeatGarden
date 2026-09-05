import type { EnemyKind } from './simulation';

export type MilestoneKind = 'qualifying' | 'defense';
export type MilestoneBodyShape = 'triangle' | 'rounded-rectangle' | 'committee-circle';

export interface MilestoneTargetDescriptor {
  kind: EnemyKind;
  shape: MilestoneBodyShape;
  symbol: string;
  nameKey: 'running.legend.target.reviewer' | 'running.legend.target.chair' | 'running.legend.target.committee';
  detailKey: 'running.legend.target.reviewerDetail' | 'running.legend.target.chairDetail' | 'running.legend.target.committeeDetail';
}

const TARGETS: Record<'reviewer' | 'chair' | 'committee', MilestoneTargetDescriptor> = {
  reviewer: { kind: 'reviewer', shape: 'triangle', symbol: '▲', nameKey: 'running.legend.target.reviewer', detailKey: 'running.legend.target.reviewerDetail' },
  chair: { kind: 'chair', shape: 'rounded-rectangle', symbol: '▰', nameKey: 'running.legend.target.chair', detailKey: 'running.legend.target.chairDetail' },
  committee: { kind: 'committee', shape: 'committee-circle', symbol: '◎', nameKey: 'running.legend.target.committee', detailKey: 'running.legend.target.committeeDetail' },
};

export const DESIGNATED_TARGET_MARKER = '△';

export const MILESTONE_TARGET_SEMANTICS = {
  qualifying: { objectiveKey: 'running.milestone.qualifyingObjective' as const, targets: [TARGETS.reviewer, TARGETS.chair] as const },
  defense: { objectiveKey: 'running.milestone.defenseObjective' as const, targets: [TARGETS.committee, TARGETS.chair, TARGETS.reviewer] as const },
} as const;

export function milestoneTargetDescriptor(kind: EnemyKind): MilestoneTargetDescriptor | null {
  return kind === 'reviewer' || kind === 'chair' || kind === 'committee' ? TARGETS[kind] : null;
}
