
console.log('START: Debugging build/index.js dependencies');

const imports = [
    // List distinct imports from index.js
    "../lib/setup-exception-listeners",
    "@next/env",
    "../lib/picocolors",
    "next/dist/compiled/picomatch",
    "fs",
    "os",
    "../lib/worker",
    "../server/config-shared",
    "next/dist/compiled/devalue",
    "next/dist/compiled/find-up",
    "next/dist/compiled/nanoid/index.cjs",
    "path",
    "../lib/constants",
    "../lib/file-exists",
    "../lib/find-pages-dir",
    "../lib/load-custom-routes",
    "../lib/non-nullable",
    "../lib/recursive-delete",
    "../lib/verify-partytown-setup",
    "../shared/lib/constants",
    "../shared/lib/entry-constants",
    "../shared/lib/router/utils",
    "../lib/bundler",
    "../server/config",
    "../shared/lib/page-path/normalize-page-path",
    "../server/require",
    "../server/ci-info",
    "./turborepo-access-trace",
    "../telemetry/events",
    "../telemetry/storage",
    "./entries",
    "./sort-by-page-exts",
    "./get-static-info-including-layouts",
    "../lib/page-types",
    "./generate-build-id",
    "./is-writeable",
    "./output/log",
    "./spinner",
    "../trace",
    "./utils",
    "./write-build-id",
    "../shared/lib/i18n/normalize-locale-path",
    "../lib/is-error",
    "../lib/is-edge-runtime",
    "../lib/recursive-copy",
    "./swc",
    "./swc/install-bindings",
    "../shared/lib/router/utils/route-regex",
    "../lib/get-files-in-dir",
    "../telemetry/events/swc-plugins",
    "../shared/lib/router/utils/app-paths",
    "../client/components/app-router-headers",
    "./webpack-build",
    "./build-context",
    "../shared/lib/page-path/normalize-path-sep",
    "../lib/is-app-route-route",
    "../lib/create-client-router-filter",
    "../server/lib/find-page-file",
    "./type-check",
    "../lib/generate-interception-routes-rewrites",
    "../server/lib/router-utils/build-data-route",
    "./collect-build-traces",
    "./manifests/formatter/format-manifest",
    "../diagnostics/build-diagnostics",
    "../server/lib/app-info-log",
    "../export/utils",
    "../lib/memory/trace",
    "../server/app-render/encryption-utils-server",
    "../trace/upload-trace",
    "../server/lib/experimental/ppr",
    "../lib/fallback",
    "./rendering-mode",
    "../shared/lib/invariant-error",
    "../shared/lib/router/utils/is-bot",
    "./turbopack-build",
    "../shared/lib/turbopack/utils",
    "../lib/inline-static-env",
    "../lib/static-env"
];

async function checkImports() {
    for (const imp of imports) {
        try {
            console.log(`Trying import: ${imp}`);
            // Resolve path relative to next/dist/build/index.js
            let modPath = imp;
            if (imp.startsWith('.')) {
                modPath = 'next/dist/build/' + imp;
            }
            require(modPath);
            console.log(`Success: ${imp}`);
        } catch (e) {
            console.error(`FAILED: ${imp} - ${e.message}`);
            // Don't crash, keep checking
        }
    }
}

checkImports().then(() => console.log('All imports checked'));
