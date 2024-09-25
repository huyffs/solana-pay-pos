import { URL_PROTOCOL } from '$lib/utils//constants';

/**
 * Optional query parameters to encode in a Solana Pay URL.
 */
export interface EncodeURLParams {
	/** `amount` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#amount) */
	amount?: string;
	/** `splToken` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#spl-token) */
	splToken?: string;
	/** `reference` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#reference) */
	reference?: string | string[];
	/** `label` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#label) */
	label?: string;
	/** `message` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#message)  */
	message?: string;
	/** `memo` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#memo) */
	memo?: string;
}

/**
 * Required and optional URL components to encode in a Solana Pay URL.
 */
export interface EncodeURLComponents extends EncodeURLParams {
	/** `recipient` in the [Solana Pay spec](https://github.com/solana-labs/solana-pay/blob/master/SPEC.md#recipient) */
	recipient: string;
}

/**
 * Encode a Solana Pay URL from required and optional components.
 *
 * @param {EncodeURLComponents} components
 *
 * @param components.recipient
 * @param components.amount
 * @param components.splToken
 * @param components.reference
 * @param components.label
 * @param components.message
 * @param components.memo
 */
export function encodeURL({ recipient, ...params }: EncodeURLComponents): string {
	let url = URL_PROTOCOL + encodeURIComponent(recipient);

	const encodedParams = encodeURLParams(params);
	if (encodedParams) {
		url += '?' + encodedParams;
	}

	return url;
}

function encodeURLParams({
	amount,
	splToken,
	reference,
	label,
	message,
	memo
}: EncodeURLParams): string {
	const params: [string, string][] = [];

	if (amount) {
		params.push(['amount', amount]);
	}

	if (splToken) {
		params.push(['spl-token', splToken]);
	}

	if (reference) {
		if (!Array.isArray(reference)) {
			reference = [reference];
		}

		for (const pubkey of reference) {
			params.push(['reference', pubkey]);
		}
	}

	if (label) {
		params.push(['label', label]);
	}

	if (message) {
		params.push(['message', message]);
	}

	if (memo) {
		params.push(['memo', memo]);
	}

	return params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}
