export const SITE_PLANNER_URL = 'https://site.meshtastic.org/';

const STORAGE_KEY = 'coverageSettings';

// Values MeshCore does not report, editable by the user in the filter menu
export const DEFAULT_COVERAGE_SETTINGS = Object.freeze({
	tx_height: 10,
	tx_gain: 2,
	tx_power_dbm: 22,
	simulation_extent: 30,
});

// Mirrors the defaults of site.meshtastic.org
const PLANNER_DEFAULTS = {
	receiver: { rx_sensitivity: -130, rx_height: 1, rx_gain: 2, rx_loss: 2 },
	environment: {
		radio_climate: 'continental_temperate',
		polarization: 'vertical',
		clutter_height: 1,
		ground_dielectric: 15,
		ground_conductivity: 0.005,
		atmosphere_bending: 301,
	},
	simulation: { situation_fraction: 95, time_fraction: 95, high_resolution: false },
	display: { color_scale: 'viridis', min_dbm: -130, max_dbm: -80, overlay_transparency: 50 },
};

const MAX_SIMULATION_EXTENT = 150;

export function loadCoverageSettings() {
	const settings = { ...DEFAULT_COVERAGE_SETTINGS };
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
		if(stored && typeof stored === 'object') {
			for(const key of Object.keys(DEFAULT_COVERAGE_SETTINGS)) {
				const value = Number(stored[key]);
				if(Number.isFinite(value)) settings[key] = value;
			}
		}
	}
	catch {
		// broken or unavailable storage, fall back to defaults
	}

	return settings;
}

export function saveCoverageSettings(settings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	}
	catch {
		// storage unavailable, settings stay in memory only
	}
}

function dbmToWatts(dbm) {
	return Number((10 ** ((dbm - 30) / 10)).toFixed(3));
}

function toBase64Url(text) {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for(let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isCoverageSupported(node) {
	return Number(node?.type) === 2 && Number.isFinite(Number(node.params?.freq));
}

export function buildSitePlannerConfig(node, settings = DEFAULT_COVERAGE_SETTINGS) {
	if(!isCoverageSupported(node)) return null;

	const extent = Math.min(Math.max(Number(settings.simulation_extent) || DEFAULT_COVERAGE_SETTINGS.simulation_extent, 1), MAX_SIMULATION_EXTENT);

	return {
		transmitter: {
			name: node.adv_name || '',
			tx_lat: node.lat,
			tx_lon: node.lon,
			tx_power: dbmToWatts(Number(settings.tx_power_dbm)),
			tx_freq: Number(node.params.freq),
			tx_height: Number(settings.tx_height),
			tx_gain: Number(settings.tx_gain),
		},
		receiver: { ...PLANNER_DEFAULTS.receiver },
		environment: { ...PLANNER_DEFAULTS.environment },
		simulation: { ...PLANNER_DEFAULTS.simulation, simulation_extent: extent },
		display: { ...PLANNER_DEFAULTS.display },
	};
}

// `run=1` in the hash makes the site planner start the simulation right away
export function getSitePlannerUrl(node, settings = DEFAULT_COVERAGE_SETTINGS) {
	const config = buildSitePlannerConfig(node, settings);
	if(!config) return null;

	return `${SITE_PLANNER_URL}#cfg=${toBase64Url(JSON.stringify(config))}&run=1`;
}
