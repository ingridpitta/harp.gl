/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { isWorkerBootstrapResponse } from "@here/harp-mapview/lib/workers/WorkerBootstrapDefs";

declare let self: Worker & {
    importScripts(..._scripts: string[]): void;
};

self.postMessage({
    type: "worker-bootstrap-request",
    dependencies: ["three"]
});

function bootstrapEventHandler(event: MessageEvent) {
    try {
        const message = event.data;
        if (isWorkerBootstrapResponse(message)) {
            self.removeEventListener("message", bootstrapEventHandler);

            const resolvedDependencies = message.resolvedDependencies;
            for (const initScript of resolvedDependencies) {
                // tslint:disable-next-line:no-console
                console.log("harp.gl(decoder): loading", initScript);
                self.importScripts(initScript);
            }

            // tslint:disable-next-line:no-console
            console.log("harp.gl(decoder): starting decoder services");
            import("./DecoderBundleMain");
        }
    } catch (error) {
        // tslint:disable-next-line:no-console
        console.log("harp.gl(decoder): unhandled exception while bootstraping", error);
    }
}

// tslint:disable-next-line:no-console
console.log("harp.gl(decoder): starting decoder services");
self.addEventListener("message", bootstrapEventHandler);
