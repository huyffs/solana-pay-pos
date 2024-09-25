import { PublicKey } from '@solana/web3.js';

/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param: string) {
	try {
		new PublicKey(param);
		return true;
	} catch (err) {
		return false;
	}
}
