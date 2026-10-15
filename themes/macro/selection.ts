// 门槛尚未用这个主题自己的标注样本校准，先沿用文档里的默认档。
// 改数字前用 scripts/eval-selection.ts 在标注样本上重跑（见 docs/selection.md）。

export const SELECTION = {
  thresholds: { T1: 60, T1_5: 65, T2: 76 } as Record<string, number>,
  understandFloor: 50,
} as const;
