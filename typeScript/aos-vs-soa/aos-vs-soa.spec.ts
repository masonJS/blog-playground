describe('AOS vs SOA', () => {
  const N = 1_000_000;
  const WARMUP = 3;
  const RUNS = 10;

  function benchmarkAos(): number {
    const points = [];
    for (let i = 0; i < N; i++) {
      points.push({ x: Math.random(), y: Math.random(), z: Math.random() });
    }

    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += points[i].x + points[i].y + points[i].z;
    }
    const elapsed = performance.now() - start;

    // 최적화 방지: sum을 사용하지 않으면 V8이 루프 자체를 제거할 수 있음
    if (sum < 0) console.log(sum);

    return elapsed;
  }

  function benchmarkSoa(): number {
    const points = {
      x: new Float64Array(N),
      y: new Float64Array(N),
      z: new Float64Array(N),
    };
    for (let i = 0; i < N; i++) {
      points.x[i] = Math.random();
      points.y[i] = Math.random();
      points.z[i] = Math.random();
    }

    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += points.x[i] + points.y[i] + points.z[i];
    }
    const elapsed = performance.now() - start;

    if (sum < 0) console.log(sum);

    return elapsed;
  }

  function median(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  it('benchmark', () => {
    // Warmup: JIT 컴파일러가 코드를 최적화할 기회를 줌
    for (let i = 0; i < WARMUP; i++) {
      benchmarkAos();
      benchmarkSoa();
    }

    const aosResults: number[] = [];
    const soaResults: number[] = [];

    // 순서 편향 방지: AOS와 SOA를 번갈아 실행
    for (let i = 0; i < RUNS; i++) {
      if (i % 2 === 0) {
        aosResults.push(benchmarkAos());
        soaResults.push(benchmarkSoa());
      } else {
        soaResults.push(benchmarkSoa());
        aosResults.push(benchmarkAos());
      }
    }

    const aosMedian = median(aosResults);
    const soaMedian = median(soaResults);

    console.log(`AOS — median: ${aosMedian.toFixed(2)}ms (runs: [${aosResults.map((r) => r.toFixed(2)).join(', ')}])`);
    console.log(`SOA — median: ${soaMedian.toFixed(2)}ms (runs: [${soaResults.map((r) => r.toFixed(2)).join(', ')}])`);
    console.log(`SOA is ${(aosMedian / soaMedian).toFixed(2)}x faster`);

    // AOS — median: 3.19ms (runs: [2.97, 3.16, 3.03, 3.32, 3.09, 3.21, 3.93, 4.02, 3.23, 3.08])
    // SOA — median: 1.73ms (runs: [2.16, 1.87, 1.93, 1.70, 1.81, 1.67, 1.74, 1.68, 1.68, 1.72])
    // SOA is 1.84x faster
  });
});
