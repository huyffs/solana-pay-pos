import { writable } from 'svelte/store';
import type { PagoRequest } from './request';
import type { Nameable } from './types';

export type Wallet = Nameable & {
	agentId: string;
	publicKey: string;
	name: string;
	requests?: PagoRequest[];
	createTimeMs: number;
};

export const walletStore = writable<Wallet[]>();
