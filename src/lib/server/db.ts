import { db } from '$lib/bootstrap';
import type { Agent } from '$lib/store/agent';
import type { Wallet } from '$lib/store/wallet';
import { Keypair, PublicKey } from '@solana/web3.js';
import type BigNumber from 'bignumber.js';
import {
	serverTimestamp,
	collection,
	setDoc,
	doc,
	query,
	getDoc,
	getDocs,
	updateDoc,
	where,
	type DocumentData,
	type DocumentReference,
	type QueryDocumentSnapshot,
	type Timestamp
} from 'firebase/firestore';
import type { PagoRequest } from '$lib/store/request';
import { encodeURL } from '$lib/utils/encodeURL';
import { PUBLIC_SPL_TOKEN } from '$env/static/public';
const requestColRef = collection(db, 'requests').withConverter<PagoRequest>({
	toFirestore: (data) => data,
	fromFirestore: (snap: QueryDocumentSnapshot<FireRequest>) => {
		const data = snap.data();
		return {
			reference: data.reference,
			signature: data.signature,
			recipient: data.recipient,
			amount: data.amount,
			label: data.label,
			message: data.message,
			memo: data.memo,
			state: data.state,
			url: data.url,
			createTimeMs: data.createTime.toMillis(),
			updateTimeMs: data.updateTime?.toMillis()
		};
	}
});

type FireAgent = {
	merchant: DocumentReference<FireMerchant>;
	userUid: string;
	forename: string;
	surname: string;
};

type FireMerchant = {
	name: string;
};

type FireWallet = {
	agent: DocumentReference<FireAgent>;
	name: string;
	publicKey: string;
	secretKey: string;
	createTime: Timestamp;
};

export type FireRequest = {
	merchant: DocumentReference;
	agent: DocumentReference;
	reference: string;
	signature?: string;
	recipient: string;
	amount: string;
	label?: string;
	message?: string;
	memo?: string;
	state: number;
	url: string;
	createTime: Timestamp;
	updateTime?: Timestamp;
};

export type CreateRequestParams = {
	agentId: string;
	recipient: string;
	reference: PublicKey;
	amount: BigNumber;
	label: string;
	message: string;
	memo?: string;
};

export async function createRequest({
	agentId,
	recipient,
	amount,
	label,
	message,
	memo
}: CreateRequestParams): Promise<PagoRequest> {
  const decimalPlaces = amount.decimalPlaces();
  if (!decimalPlaces) {
    throw new Error('Error: Cannot createRequest: amount.decimalPlaces() returned a NaN value')
  }
	const reference = new Keypair().publicKey.toBase58();
	const data = {
		reference,
		recipient,
		amount: amount.toFixed(decimalPlaces),
		splToken: PUBLIC_SPL_TOKEN,
		label,
		message,
		memo
	};
	const url = encodeURL(data);
	await setDoc(doc(db, 'requests', reference.toString()), {
		...data,
		url,
		agent: doc(db, 'agents', agentId),
		createTime: serverTimestamp()
	});

	const request: PagoRequest = {
		...data,
		url,
		state: 0,
		createTimeMs: new Date().getTime()
	};
	return request;
}

export function updateRequestState(
	reference: string,
	signature: string,
	state: number
): Promise<void> {
	return updateDoc(doc(requestColRef, reference), { state, signature });
}

export async function getRequest(reference: string): Promise<PagoRequest | undefined> {
	const snap = await await getDoc(doc(requestColRef, reference));
	if (snap.exists()) {
		return snap.data();
	}
}

export async function getRequestByCheckout(
	checkoutId: string,
	amount: BigNumber
): Promise<PagoRequest | undefined> {
  const decimalPlaces = amount.decimalPlaces();
  if (!decimalPlaces) {
    throw new Error('Error: Cannot getRequestByCheckout: amount.decimalPlaces() returned a NaN value')
  }
	const whereQr = where(
		'memo',
		'==',
		`${checkoutId},${amount.toFixed(decimalPlaces)}`
	);

	const queryIns = query(requestColRef, whereQr);
	const snap = await getDocs(queryIns);
	if (!snap.empty) {
		return snap.docs[0].data();
	}
}

export async function createWallet(agentId: string, name: string): Promise<Wallet> {
	const wallet = Keypair.generate();
	const publicKey = wallet.publicKey.toString();

  const secretKey = new TextDecoder().decode(wallet.secretKey);
  
	await setDoc(doc(db, 'wallets', publicKey), {
		agent: doc(db, 'agents', agentId),
		name,
		secretKey,
		createTime: serverTimestamp()
	});

	return {
		agentId,
		name,
		publicKey,
		createTimeMs: new Date().getTime()
	};
}

export async function getCurrentWalletIdByAgentId(agentId: string): Promise<string | undefined> {
	const whereQr = where('agent', '==', doc(db, 'agents', agentId));

	const queryIns = query(collection(db, 'wallets'), whereQr);
	const wallets = await getDocs(queryIns);

	if (!wallets.empty) {
		return wallets.docs[0].id;
	}
}

export async function getAgent(userUid: string): Promise<Agent> {
	const whereQr = where('userUid', '==', userUid);

	const queryIns = query(
		collection(db, 'agents').withConverter<FireAgent>(converter<FireAgent>()),
		whereQr
	);
	const snap = await getDocs(queryIns);
	if (snap.empty) {
		return Promise.reject(`No agent for user id: ${userUid}`);
	}
	const aDoc = snap.docs[0];
	const aData = aDoc.data();
	const mSnap = await getDoc(aData.merchant.withConverter(converter<FireMerchant>()));
	const mData = mSnap.data();

	const whereWQr = where('agent', '==', aDoc.ref);

	const queryWIns = query(
		collection(db, 'wallets').withConverter<FireWallet>(converter<FireWallet>()),
		whereWQr
	);

	const wSnap = await getDocs(queryWIns);
	const wallets = wSnap.docs.map<Wallet>((wDoc) => {
		const wData = wDoc.data();
		return {
			agentId: aDoc.id,
			name: wData.name,
			publicKey: wDoc.id,
			createTimeMs: wData.createTime.toMillis()
		};
	});

	return {
		id: aDoc.id,
		merchant: { id: aData.merchant.id, name: mData!.name },
		userId: userUid,
		forename: aData.forename,
		surname: aData.surname,
		wallets
	};
}

export function converter<T>() {
	return {
		toFirestore: (data: T) => data,
		fromFirestore: (snap: QueryDocumentSnapshot<DocumentData>) => snap.data() as T
	};
}
