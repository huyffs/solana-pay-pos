import type { ServerLoad } from '@sveltejs/kit';
/** @type {import('./$types').LayoutServerLoad} */
export const load: ServerLoad = async ({ locals }) => {
	return {
		agent: locals.agent,
		user: locals.user
	};
};
