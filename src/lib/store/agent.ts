import { writable } from 'svelte/store';
import type { Identifiable, Nameable } from './types';
import type { Wallet } from './wallet';

export type Merchant = Identifiable & Nameable;

export type Agent = Identifiable & {
	merchant: Merchant;
	userId: string;
	forename: string;
	surname: string;
	wallets: Wallet[];
};

export const agentStore = writable<Agent | undefined>();
