// import { auth } from '$lib/bootstrap';
import jwt_decode from 'jwt-decode';
import { parse } from 'cookie';
import { FIREBASE_ADMIN_KEY } from '$env/static/private';
const firebaseEnv = JSON.parse(FIREBASE_ADMIN_KEY);

export async function getClaimsFromCookie(
	cookiesString: string | null
): Promise<ReturnType<typeof verifyToken>> {
	if (cookiesString) {
		const cookies = parse(cookiesString);
		if (cookies.session) {
			return await verifyToken(cookies.session);
		}
	}
	return Promise.reject();
}

export async function verifyToken(tokenId: string) {
	const resGetPK = await fetch(
		'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
	);
	if (!resGetPK.ok) {
		throw new Error('Can not get API PK key');
	}
	const publicKeys: { [key: string]: string } = await resGetPK.json();
	const token: {
		exp: number;
		iat: number;
		aud: string;
		iss: string;
		sub: string;
		auth_time: number;
		kid: string;
		user_id: string;
	} = jwt_decode(tokenId);
	const tokenHeader: {
		kid: string;
		alg: string;
	} = jwt_decode(tokenId, { header: true });
	let tokenVerify = true;
	const checkToken = () => {
		if (!tokenVerify) {
			throw new Error('token undefined');
		}
	};
	// Verify token
	tokenVerify &&= tokenHeader.alg === 'RS256';

	const checkKid = Object.keys(publicKeys).find((key) => (tokenHeader.kid || token.kid) == key);
	tokenVerify &&= checkKid !== null && checkKid !== undefined;

	tokenVerify &&= token.exp !== null && token.exp * 1000 > Date.now();

	tokenVerify &&= token.iat !== null;

	tokenVerify &&= token.aud !== null && firebaseEnv.project_id === token.aud;

	tokenVerify &&=
		token.iss !== null && `https://securetoken.google.com/${firebaseEnv.project_id}` === token.iss;

	tokenVerify &&= token.sub !== null && token.sub !== '';

	tokenVerify &&= token.auth_time != null;

	checkToken();

	return {
		header: tokenHeader,
		payload: token
	};
}
