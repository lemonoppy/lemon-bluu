import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { BankAccountHeaderData } from 'typings/portal';

class UserApiClient {
	#headerInfo: Array<BankAccountHeaderData> = [];

	#loaded = false;
	#lastLoadTimestamp = 0;

	async #getData<T>(
		data: Array<T>,
		reload: boolean = false,
		fetchOptions: Parameters<typeof fetch>,
		additionalQueryParams?: Record<string, string>,
	): Promise<T[]> {
		if (data.length > 0 && !reload) {
			return data;
		}
		const [url, ...options] = fetchOptions;
		const queryParams = new URLSearchParams({
			...additionalQueryParams,
		});
		logger.debug(
			`UserClient: Fetching data for ${url}?${queryParams.toString()}`,
		);
		const response = await fetch(
			`${Config.portalApiUrl}/${url}?${queryParams.toString()}`,
			...options,
		);
		if (!response.ok) {
			logger.error(
				`UserClient: Failed to fetch data: ${response.statusText} for ${url}`,
			);
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	async getHeaderInfo(
		reload: boolean = false,
	): Promise<Array<BankAccountHeaderData>> {
		this.#headerInfo = await this.#getData(this.#headerInfo, reload, ['bank/header-info'])

		return this.#headerInfo;
	}

	async reload(): Promise<void> {
		this.#loaded = false;

		await Promise.all([
			this.getHeaderInfo(true),
		]);

		this.#lastLoadTimestamp = Date.now();
		this.#loaded = true;
	}

	async reloadIfError() {
		if (
			!this.#loaded ||
			Date.now() - this.#lastLoadTimestamp >= 30 * 60 * 1000 // 12 hours in milliseconds
		) {
			this.reload();
		}
	}
}

export const UserClient = new UserApiClient();
