import { getClaimsFromCookie } from '$lib/utils/auth';
import { createWallet, getAgent } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

let counter = 0;

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async function ({ event, resolve }) {
	const {
		request: { method, headers }
	} = event;
	const logPrefix = `${++counter}\t${method}\t`;
	const logSuffix = `${event.url.pathname} ${event.url.searchParams.toString()} `;
	const dashes = event.url.pathname.startsWith('/p/') ? '---' : '-';
	console.debug(logPrefix, `${dashes}>`, logSuffix);

	let { user, agent } = event.locals;
	if (!user) {
		try {
			const claims = await getClaimsFromCookie(headers.get('cookie'));
			user = {
				id: claims.payload.user_id,
				name: ''
			};
			event.locals.user = user;
		} catch (err) {
			// do nothing
		}
	}
	
	if(!user){
		event.locals.agent = undefined;
	}

	if (user && !agent) {
		try {
			agent = await getAgent(user.id);
			if (!agent.wallets.length) {
				await createWallet(
					agent.id,
					`${agent.merchant.name}: ${agent.forename} ${agent.surname} - ${new Date().toString()}`
				);
			}
			event.locals.agent = agent;
		} catch (err) {
			console.error('Error hook get agent:', err);
		}
	}

	try {
		const response = await resolve(event);
		console.debug(logPrefix, `<${dashes}`, logSuffix, response.status);
		return response;
	} catch (err) {
		console.error(`Error loading ${event.url.pathname}: ${err}`);
		return new Response('', { status: 500 });
	}
};

//* Remove it in https://github.com/sveltejs/kit/discussions/5883
// /** @type {import('@sveltejs/kit').GetSession} */
// export const getSession: GetSession = async (event) => {
// 	return {
// 		agent: event.locals.agent
// 	};
// };
