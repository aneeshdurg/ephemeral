export class TestSuite {
    assert(cond: boolean, msg?: string) {
        if (!cond) {
            throw new Error("Assertion Failed!\n" + msg);
        }
    }

    async run() {
        const prototype = Object.getPrototypeOf(this);
        const properties = Object.getOwnPropertyNames(prototype);
        const tests = properties.filter((n: string) => {
            return (
                n.startsWith("test") && typeof (this as any)[n] === 'function');
        });
        const that = this;
        let failures = 0;
        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            console.group(test);
            console.time(test);
            try {
                const testfn = ((that as any)[test]).bind(that);
                await testfn();
                console.log("[TEST] SUCCESS");
            } catch (e) {
                console.log(e);
                failures += 1;
                console.log("[TEST] FAILED");
            }
            console.timeEnd(test);
            console.groupEnd();
        }
        if (failures == 0)
            console.log("[SUITE] SUCCESS");
        else
            console.log("[SUITE] FAILED");
    }

    async sleep(time: number) {
        return new Promise(r => setTimeout(r, time));
    }
}
