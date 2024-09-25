import type { Load } from '@sveltejs/kit';
import { redirect } from '$lib/utils/route';
import { agentStore } from '$lib/store/agent';
import { get } from 'svelte/store';
/** @type {import('./$types').PageLoad} */
export const load: Load = async ({ parent }) => {
	const data = await parent();

	if (!get(agentStore)) {
		return redirect('/auth');
	}

	return data;
};
