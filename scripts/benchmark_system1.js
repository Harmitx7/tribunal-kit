const { System1Provider } = require('../src/system1/provider');

const dataset = [
  { name: 'README changes', files: ['README.md'], expected: 0 },
  { name: 'CSS formatting changes', files: ['src/index.css'], expected: 0 },
  { name: 'Single-file component', files: ['src/components/Button.jsx'], expected: 1 },
  {
    name: 'Multi-file feature',
    files: ['src/components/List.jsx', 'src/hooks/useList.js'],
    expected: 2,
  },
  { name: 'Auth schema', files: ['prisma/schema.prisma', 'src/pages/api/auth.js'], expected: 3 },
  { name: 'CI/CD changes', files: ['.github/workflows/deploy.yml'], expected: 3 },
  { name: 'Dependency changes', files: ['package.json'], expected: 2 },
];

async function run() {
  console.log('System-1 Benchmark');
  console.log('==================\n');

  const provider = new System1Provider();
  if (!provider.isAvailable()) {
    console.error(
      "System-1 is NOT available. Please install it with 'npx tribunal-kit system1 enable' (or run locally: node bin/wrapper.js system1 enable).",
    );
    process.exit(1);
  }

  const startCold = Date.now();
  await provider._initSession();
  const endCold = Date.now();
  console.log(`Cold Initialization: ${endCold - startCold}ms`);

  let correct = 0;
  let totalLatency = 0;

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const startInference = Date.now();
    let result = -1;
    try {
      result = await provider.classifyImpact(item.files, item.name);
    } catch (e) {
      console.error(`Inference failed for "${item.name}": ${e.message}`);
    }
    const endInference = Date.now();
    const latency = endInference - startInference;

    console.log(`[${i === 0 ? 'First/Warm' : 'Warm'} Inference] ${item.name}`);
    console.log(`  Latency: ${latency}ms`);
    console.log(`  Predicted: ${result}, Expected: ${item.expected}`);

    if (result === item.expected) {
      correct++;
      console.log(`  Result: MATCH`);
    } else {
      console.log(`  Result: MISMATCH`);
    }
    totalLatency += latency;
  }

  console.log('\nSummary:');
  console.log(
    `Accuracy: ${((correct / dataset.length) * 100).toFixed(2)}% (${correct}/${dataset.length})`,
  );
  console.log(`Average Latency: ${(totalLatency / dataset.length).toFixed(2)}ms`);
}

run().catch(console.error);
