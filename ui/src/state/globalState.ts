import {
	atom,
	RecoilState,
	useRecoilTransactionObserver_UNSTABLE,
	useRecoilCallback,
	RecoilValue,
	Loadable
} from 'recoil';
import * as React from 'react';
import { SelectedRoute } from '../services/schema/SchemaService';

enum GlobalStateKeys {
	LOGIN_DETAILS = 'LoginDetails',
	SCHEMA = 'Schema',
	Route = 'Route'
}

const KEY_PREFIX = 'restura-';

class GlobalState {
	loginDetails: RecoilState<Restura.LoginDetails | undefined>;
	schema: RecoilState<Restura.Schema | undefined>;
	selectedRoute: RecoilState<SelectedRoute | undefined>;

	saveToStorageList: string[] = [];

	constructor() {
		this.loginDetails = atom<Restura.LoginDetails | undefined>({
			key: GlobalStateKeys.LOGIN_DETAILS,
			default: this.loadFromLocalStorage(GlobalStateKeys.LOGIN_DETAILS, undefined)
		});

		this.schema = atom<Restura.Schema | undefined>({
			key: GlobalStateKeys.SCHEMA,
			default: undefined
		});

		this.selectedRoute = atom<{ baseUrl: string; path: string } | undefined>({
			key: GlobalStateKeys.Route,
			default: undefined
		});

		// Save Variables off into local storage on change
		this.saveToStorageList = [GlobalStateKeys.LOGIN_DETAILS];
	}

	private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
		let item = localStorage.getItem(KEY_PREFIX + key);
		if (!item) return defaultValue;
		try {
			item = JSON.parse(item);
		} catch (e) {}
		if (typeof item === 'string' && item === 'undefined') return defaultValue;
		// @ts-ignore
		return item;
	}
}

export function clearPersistentState() {
	// All we really need to do is clear local storage
	localStorage.clear();
}

export const GlobalStateObserver: React.FC = () => {
	useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
		for (const item of snapshot.getNodes_UNSTABLE({ isModified: true })) {
			let value = snapshot.getLoadable(item).contents as string;
			if (process.env.NODE_ENV === 'development') {
				console.log('Recoil item changed: ', item.key);
				console.log('Value: ', value);
			}

			if (globalState.saveToStorageList.includes(item.key)) {
				if (typeof value === 'object') value = JSON.stringify(value);
				localStorage.setItem(KEY_PREFIX + item.key, value);
			}
		}
	});
	return null;
};

const globalState = new GlobalState();
export default globalState;

/**
 * Returns a Recoil state value, from anywhere in the app.
 *
 * Can be used outside of the React tree (outside a React component), such as in utility scripts, etc.

 * <GlobalStateInfluencer> must have been previously loaded in the React tree, or it won't work.
 * Initialized as a dummy function "() => null", it's reference is updated to a proper Recoil state mutator when GlobalStateInfluencer is loaded.
 *
 * @example const lastCreatedUser = getRecoilExternalValue(lastCreatedUserState);
 *
 */
export let getRecoilExternalLoadable: <T>(recoilValue: RecoilValue<T>) => Loadable<T> = () => null as any;

/**
 * Retrieves the value from the loadable. More information about loadables are here:
 * https://recoiljs.org/docs/api-reference/core/Loadable
 * @param recoilValue Recoil value to retrieve its base value
 */
export function getRecoilExternalValue<T>(recoilValue: RecoilValue<T>): T {
	return getRecoilExternalLoadable<T>(recoilValue).getValue();
}

/**
 * Sets a Recoil state value, from anywhere in the app.
 *
 * Can be used outside of the React tree (outside a React component), such as in utility scripts, etc.
 *
 * <RecoilExternalStatePortal> must have been previously loaded in the React tree, or it won't work.
 * Initialized as a dummy function "() => null", it's reference is updated to a proper Recoil state mutator when GlobalStateInfluencer is loaded.
 *
 * NOTE - Recoil value isn't fully changed until some time later.
 *
 * @example setRecoilExternalState(lastCreatedUserState, newUser)
 */
export let setRecoilExternalValue: <T>(
	recoilState: RecoilState<T>,
	valOrUpdater: ((currVal: T) => T) | T
) => void = () => null as any;

export const GlobalStateInfluencer: React.FC = () => {
	useRecoilCallback(({ set, snapshot }) => {
		setRecoilExternalValue = set;
		getRecoilExternalLoadable = snapshot.getLoadable;
		return async () => {};
	})();

	// We need to update the getRecoilExternalLoadable every time there's a new snapshot
	// Otherwise we will load old values from when the component was mounted
	useRecoilTransactionObserver_UNSTABLE(({ snapshot }) => {
		getRecoilExternalLoadable = snapshot.getLoadable;
	});

	return null;
};
