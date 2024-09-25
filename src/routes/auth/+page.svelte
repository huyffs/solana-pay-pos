<script lang="ts">
	import { me } from '$lib/utils/fetch';
	import { isPasswordComplex, isValidEmail } from '$lib/utils/form';
	import {
		Button,
		Form,
		FormGroup,
		InlineLoading,
		InlineNotification,
		PasswordInput,
		TextInput
	} from 'carbon-components-svelte';
	import { getAuth, signInWithEmailAndPassword, browserLocalPersistence } from 'firebase/auth';
	import { FirebaseError, getApps, initializeApp } from 'firebase/app';
	import { goto } from '$app/navigation';
	import { agentStore, type Agent } from '$lib/store/agent';
	import { PUBLIC_FIREBASE_CONFIG } from '$env/static/public';

	/** @type {import('./$types').PageData} */
	let data: { agent: Agent };

	type FormError = {
		email?: string;
		password?: string;
		general?: string;
	};

	let formErrors: FormError;

	let formData = {
		email: '',
		password: ''
	};
	let isSaving = false;

	function showErrors(errors: FormError) {
		formErrors = errors;
		setTimeout(() => {
			formErrors = {};
		}, 15000);
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		const errors: FormError = {};
		if (!formData.email) {
			errors.email = 'Email address is required';
		} else if (!isValidEmail(formData.email)) {
			errors.email = 'Email address is invalid';
		}

		if (!formData.password) {
			errors.password = 'Your password is required';
		} else if (!isPasswordComplex(formData.password)) {
			errors.password =
				'Passwords must be at least 8 characters (including 1 uppercase letter, 1 number and 1 lowercase letter)';
		}

		if (Object.keys(errors).length) {
			showErrors(errors);
			return;
		}

		isSaving = true;
		try {
			if (!getApps().length) {
				initializeApp(JSON.parse(PUBLIC_FIREBASE_CONFIG));
			}

			const auth = getAuth();
			await auth.setPersistence(browserLocalPersistence);
			const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
			if (cred?.user) {
				let { user } = cred;
				const token = await user.getIdToken();
				const res = await me(token);
				if (res.ok) {
					await user.getIdTokenResult(true);
					const resAgent = await res.json();
					agentStore.set(resAgent);
					goto('/')
				} else {
					console.error('Failed to log in', res.status, await res.text());
				}
			}
		} catch (err) {
			if (err instanceof FirebaseError) {
				switch (err.code) {
					case 'auth/too-many-requests':
						errors.general =
							'Too many requests - Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
						break;
					case 'auth/wrong-password':
						errors.password = 'Invalid password for this account';
				}
			} else {
				errors.general = 'Something went wrong';
			}
			showErrors(errors);
			console.error(err);
		}

		isSaving = false;
	}
</script>

<section class="sign-in">
	<h1>Guerrilla Pago</h1>
	<Form on:submit={onSubmit} method="post">
		<FormGroup legendText="Sign in with your email &nbsp; password">
			<TextInput
				autofocus
				labelText="Email"
				name="email"
				type="email"
				placeholder="Email address"
				bind:value={formData.email}
				invalid={!!formErrors?.email}
				invalidText={formErrors?.email}
			/>
			<PasswordInput
				labelText="Password"
				placeholder="Password"
				bind:value={formData.password}
				invalid={!!formErrors?.password}
				invalidText={formErrors?.password}
			/>
			{#if formErrors?.general}
				<InlineNotification lowContrast kind="error" title="Error:" subtitle={formErrors.general} />
			{/if}
			{#if isSaving}
				<div class="saving-modal" />
				<InlineLoading status="active" description="Checking account..." />
			{:else}
				<Button kind="secondary" type="submit" class="btn-submit">SUBMIT</Button>
			{/if}
		</FormGroup>
	</Form>
</section>

<style lang="scss">
	.sign-in {
		width: 25em;
		margin: 0 auto;
	}
</style>
