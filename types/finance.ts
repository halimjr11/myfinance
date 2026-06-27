import type { Timestamp } from "firebase/firestore";

export type TransactionType = "income" | "expense" | "saving" | "investment" | "debt";

export type MoneyMindset = "need" | "want" | "future" | "debt";
export type WishlistPriority = "low" | "medium" | "high";

export type Transaction = {
  id: string;
  type: TransactionType;
  title: string;
  category: string;
  mindset: MoneyMindset;
  amount: number;
  date: string;
  note?: string;
  createdAt?: Timestamp;
};

export type Budget = {
  id: string;
  category: string;
  month: string;
  limit: number;
  mindset: MoneyMindset;
  createdAt?: Timestamp;
};

export type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  createdAt?: Timestamp;
};

export type WishlistGroup = {
  id: string;
  title: string;
  description: string;
  color: string;
  deadline: string;
  createdAt?: Timestamp;
};

export type WishlistItem = {
  id: string;
  title: string;
  category: string;
  priority: WishlistPriority;
  targetAmount: number;
  deadline: string;
  note?: string;
  completed: boolean;
  createdAt?: Timestamp;
};

export type TransactionDraft = Omit<Transaction, "id" | "createdAt">;
export type BudgetDraft = Omit<Budget, "id" | "createdAt">;
export type GoalDraft = Omit<Goal, "id" | "createdAt">;
export type WishlistGroupDraft = Omit<WishlistGroup, "id" | "createdAt">;
export type WishlistDraft = Omit<WishlistItem, "id" | "createdAt">;
