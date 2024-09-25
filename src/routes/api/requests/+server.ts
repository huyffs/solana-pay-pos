import type { RequestEvent } from '@sveltejs/kit';
import { Keypair } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { createRequest } from '$lib/server/db';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export const POST = async ({ request, locals }: RequestEvent) => {
	const body = await request.json();
	const amount = new BigNumber(body.amount || 0);
	if (amount.isLessThanOrEqualTo(0)) {
		throw error(400);
	}
	const { agent } = locals;
	if (agent) {
		try {
			const wallet = agent.wallets[0];

			const request = await createRequest({
				agentId: agent.id,
				recipient: wallet.publicKey,
				reference: new Keypair().publicKey,
				amount: amount,
				label: `Canabis from ${agent.merchant.name || 'the best'}`,
				message: `Sale of canabis by agent: ${agent?.forename} ${agent?.surname}`,
				memo: agent.id
			});
			if (wallet.requests) {
				wallet.requests.unshift(request);
			} else {
				wallet.requests = [request];
			}
			return new Response(JSON.stringify(request));
		} catch (err) {
			console.error('err', err);
			if (!err) {
				throw error(401);
			}
		}
	}
	console.error('Bad locals:', JSON.stringify(locals));
	throw error(500);
};
