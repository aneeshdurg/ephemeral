export declare class TestSuite {
    assert(cond: boolean, msg?: string): void;
    run(): Promise<void>;
    sleep(time: number): Promise<unknown>;
    retry(f: () => boolean, maxRetries: number, interval: number): Promise<void>;
}
