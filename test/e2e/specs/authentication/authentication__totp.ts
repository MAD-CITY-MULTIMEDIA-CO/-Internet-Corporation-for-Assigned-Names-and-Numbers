/**
 * @group authentication
 */

import { DataHelper, LoginPage, SecretsManager, TOTPClient } from '@automattic/calypso-e2e';
import { Page, Browser } from 'playwright';

declare const browser: Browser;

describe( DataHelper.createSuiteTitle( 'Authentication: TOTP' ), function () {
	const credentials = SecretsManager.secrets.testAccounts.totpUser;
	let page: Page;
	let loginPage: LoginPage;

	beforeAll( async () => {
		page = await browser.newPage();
	} );

	// This spec intentionally manually calls individual
	// methods from LoginPage to separate out the steps that
	// are bundled together in the TestAccount class.
	it( 'Navigate to Login page', async function () {
		// Test redirect to full URL.
		await page.goto(
			DataHelper.getCalypsoURL(
				`log-in?site=${ credentials.primarySite }&redirect_to=%2Fsettings%2Fgeneral%2F${ credentials.primarySite }`
			)
		);
	} );

	it( 'Enter username', async function () {
		loginPage = new LoginPage( page );
		await loginPage.fillUsername( credentials.username );
		await loginPage.clickSubmit();
	} );

	it( 'Enter password', async function () {
		await loginPage.fillPassword( credentials.password );
	} );

	it( 'Submit form', async function () {
		await Promise.all( [ page.waitForNavigation(), loginPage.clickSubmit() ] );
	} );

	it( 'Enter 2FA code', async function () {
		const totpClient = new TOTPClient( credentials.totpKey as string );
		const code = totpClient.getToken();

		await loginPage.submitVerificationCode( code );
	} );

	it( 'User is redirected to Settings > General Settings', async function () {
		const redirectedURL = DataHelper.getCalypsoURL( '/settings/general' );
		await page.waitForURL( `${ redirectedURL }/${ credentials.primarySite }` );
	} );
} );
