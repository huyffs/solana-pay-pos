import type { LoadEvent } from '@sveltejs/kit';
import { agentStore } from '$lib/store/agent';

/** @type {import('./$types').LayoutLoad} */
export async function load({ data }: LoadEvent) {
	agentStore.set(data?.agent);
	return data;
}
