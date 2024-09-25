import {
	createRequest,
	createWallet,
	getCurrentWalletIdByAgentId,
	getRequestByCheckout
} from '$lib/server/db';
import { Keypair } from '@solana/web3.js';
import type { RequestEvent } from '@sveltejs/kit';
import BigNumber from 'bignumber.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export const get = async ({ params }: RequestEvent) => {
	const amount = new BigNumber(params.amount || 0);
	if (amount.isGreaterThan(0)) {
		const { id, size } = params;
		if (!id || id == undefined) {
			throw error(404);
		}
		try {
			let request = await getRequestByCheckout(id, amount);
			if (!request) {
				const agentId = 'website';
				let walletId = await getCurrentWalletIdByAgentId(agentId);
				if (!walletId) {
					const wallet = createWallet(agentId, 'Website wallet');
					walletId = (await wallet).publicKey;
				}
        const decimalPlaces = amount.decimalPlaces();
        if (!decimalPlaces) {
          throw new Error('Error: Cannot /checkouts/[id]-[amount]: amount.decimalPlaces() returned a NaN value')
        }      
				request = await createRequest({
					agentId,
					recipient: walletId,
					reference: new Keypair().publicKey,
					amount: amount,
					label: `Canabis from the web`,
					message: `Sale of canabis`,
					memo: `${id},${amount.toFixed(decimalPlaces)}`
				});
			}
			return new Response('', {
				status: 302,
				headers: { location: `/requests/${request.reference}-${size}` }
			});
		} catch (err) {
			console.error('err', err);
			throw error(500);
		}
	}
	throw error(400);
};
