import { getRequest, updateRequestState } from '$lib/server/db';
import type { RequestEvent } from '@sveltejs/kit';
import { findTransactionSignature, validateTransactionSignature } from '@solana/pay';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { error } from '@sveltejs/kit';
import { PUBLIC_SPL_TOKEN } from '$env/static/public';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

/** @type {import('./$types').RequestHandler} */
export const get = async ({ params: { reference } }: RequestEvent) => {
	try {
		const pReference = reference || 'sol';
		const request = await getRequest(pReference || 'sol');
		if (!request) {
			throw error(404, 'Not found');
		}

		const sig = await findTransactionSignature(
			connection,
			new PublicKey(request.reference),
			undefined,
			'confirmed'
		);

		if (sig.memo !== request.memo) {
			console.warn('Request mem not match');
		}

		await validateTransactionSignature(
			connection,
			sig.signature,
			new PublicKey(request.recipient),
			new BigNumber(request.amount),
			new PublicKey(PUBLIC_SPL_TOKEN),
			new PublicKey(request.reference)
		);

		await updateRequestState(pReference, sig.signature, 2);
		return new Response(
			JSON.stringify({
				...request,
				signature: sig.signature,
				state: 2
			})
		);
	} catch (err) {
		if (!err) {
			throw error(401);
		}
	}
	throw error(500);
};
