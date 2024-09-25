const defaultHeaders = {
	'Content-Type': 'application/json'
};

export async function me(token: string): Promise<Response> {
	const res = await fetch('/api/me', {
		method: 'post',
		headers: {
			...defaultHeaders,
			Authorization: 'Bearer ' + token
		},
		body: ''
	});
	return res;
}
