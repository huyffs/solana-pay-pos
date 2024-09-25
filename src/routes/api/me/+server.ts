import type { RequestEvent } from '@sveltejs/kit';
// import { auth } from '$lib/bootstrap';
import { error } from '@sveltejs/kit';
import { serialize } from 'cookie';
import { getAgent } from '$lib/server/db';
import { verifyToken } from '$lib/utils/auth';

const COOKIE_EXPIRE = 3_600 * 24;

/** @type {import('./$types').RequestHandler} */
export const POST = async (event: RequestEvent) => {
	let status = 500;
	try {
		const authHeader = event.request.headers.get('Authorization');
		const headers: Record<string, string> = {};

		if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
			status = 400;
		} else {
			const idToken = authHeader.substring(7);
			const claim = await (await verifyToken(idToken)).payload;
			const now = new Date().getTime() / 1000;
			if (now - claim.auth_time > COOKIE_EXPIRE) {
				headers['Set-Cookie'] =
					'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT, session.sig=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly';
				status = 401;
			} else {
				// const sessionCookie = await auth.createSessionCookie(idToken, {
				// 	expiresIn: COOKIE_EXPIRE * 1000
				// });
				headers['Set-Cookie'] = serialize('session', idToken, {
					path: '/',
					httpOnly: true,
					sameSite: 'strict',
					secure: process.env.NODE_ENV === 'production',
					maxAge: COOKIE_EXPIRE
				});

				const agent = await getAgent(claim.user_id);

				event.locals.agent = agent;
				return new Response(JSON.stringify(agent), { headers });
			}
		}
	} catch (err) {
		if (err instanceof Error) {
			throw error(status, err.message);
		} else {
			throw error(status, err?.toString()||"Bad request");
		}
	}
};
