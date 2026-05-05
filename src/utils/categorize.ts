import { CategoryRule } from '../storage/categoryRulesStorage';

export function applyRules(description: string, rules: CategoryRule[], defaultCategoryId: string): string {
  const lower = description.toLowerCase();
  const match = rules.find(r => lower.includes(r.keyword.toLowerCase()));
  return match ? match.categoryId : defaultCategoryId;
}
