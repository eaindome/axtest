export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Db65DRdr.js",app:"_app/immutable/entry/app.BmCt6Nm-.js",imports:["_app/immutable/entry/start.Db65DRdr.js","_app/immutable/chunks/DFbkfI-8.js","_app/immutable/chunks/BDr2kAM-.js","_app/immutable/chunks/95CQaKvR.js","_app/immutable/chunks/DoSQSqVt.js","_app/immutable/entry/app.BmCt6Nm-.js","_app/immutable/chunks/BDr2kAM-.js","_app/immutable/chunks/IXX1kFzp.js","_app/immutable/chunks/BpdFeKXe.js","_app/immutable/chunks/DAC6uV-M.js","_app/immutable/chunks/DoSQSqVt.js","_app/immutable/chunks/BqC2knW8.js","_app/immutable/chunks/DnNyGK3Y.js","_app/immutable/chunks/D_3jdvwc.js","_app/immutable/chunks/7uw3R1ih.js","_app/immutable/chunks/95CQaKvR.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/editor",
				pattern: /^\/editor\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(auth)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/projects",
				pattern: /^\/projects\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/projects/[id]",
				pattern: /^\/projects\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(auth)/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
