
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCoins(coins: number): string {
  return `${coins.toLocaleString()}C`;
}

export function coinsToUSD(coins: number): number {
  return coins * 0.0001;
}

export function usdToCoins(usd: number): number {
  return usd / 0.0001;
}