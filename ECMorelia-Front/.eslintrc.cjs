module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		"standard",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
		"eslint-config-prettier"
	],
	ignorePatterns: ["dist", ".eslintrc.cjs"],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.json"
	},
	plugins: ["react-refresh", "prettier"],
	rules: {
		"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
		quotes: ["error", "double"],
		"comma-dangle": ["error", "never"],
		"require-await": "off",
		"no-nested-ternary": "error",
		"no-shadow": "off",
		"@typescript-eslint/no-shadow": "error",
		"@typescript-eslint/no-unnecessary-condition": "error",
		"@typescript-eslint/require-await": "error"
	},
	settings: {
		react: {
			version: "detect"
		}
	}
};
