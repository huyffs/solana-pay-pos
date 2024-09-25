import { redirect as red } from '@sveltejs/kit';

export function redirect(
	pathname: string,
	search?: string | Record<string, string> | string[][] | URLSearchParams
): Record<string, never> | { status: number; redirect: string } {
	let searchString = '';
	if (search) {
		searchString = '?' + new URLSearchParams(search);
	}
	const path = pathname + searchString;
	//* https://kit.svelte.dev/docs/load#redirects
	throw red(307, path);
}
