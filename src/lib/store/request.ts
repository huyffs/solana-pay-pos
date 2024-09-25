import { writable } from 'svelte/store';

export type PagoRequest = {
	reference: string;
	signature?: string;
	recipient: string;
	amount: string;
	label?: string;
	message?: string;
	memo?: string;
	state: number;
	url: string;
  createTimeMs: number;
  updateTimeMs?: number;
};

export const requestStore = writable<PagoRequest[]>([]);
