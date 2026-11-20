// Expressions own only their declared targets. Identity and wardrobe morphs
// remain independent, including when one geometry is shared by several actors.
const clamp = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export function readExpressionContract(figure) {
  let contract = null;
  figure.traverse(node => {
    const value = node.userData.avatarExpressionContract;
    if (!value) return;
    try { contract = typeof value === 'string' ? JSON.parse(value) : value; } catch { /* legacy */ }
  });
  return contract?.version === 1 && contract.targets ? contract : null;
}

export function createExpressionController(figure) {
  const contract = readExpressionContract(figure);
  if (!contract) return null;
  const bindings = [];
  figure.traverse(node => {
    if (!node.morphTargetDictionary || !node.morphTargetInfluences) return;
    for (const [channel, name] of Object.entries(contract.targets)) {
      const index = node.morphTargetDictionary[name];
      if (index !== undefined) bindings.push({ node, index, channel });
    }
  });
  const reset = () => { for (const { node, index } of bindings) node.morphTargetInfluences[index] = 0; };
  return {
    contract,
    update({ expression = 'neutral', intensity = 1, viseme = 'rest', speech = 1,
      gaze = 0, blink = 0, time = 0, autoBlink = true, channels = {} } = {}) {
      const values = {};
      const mix = (source, weight) => {
        for (const [channel, value] of Object.entries(source || {})) {
          if (Object.hasOwn(contract.targets, channel)) values[channel] = Math.max(values[channel] || 0, clamp(value) * clamp(weight));
        }
      };
      mix(contract.expressions?.[expression], intensity);
      mix(contract.visemes?.[viseme], speech);
      // A reproducible blink uses elapsed playback time, so pause freezes it.
      const phase = ((time % 4.1) + 4.1) % 4.1;
      const automatic = autoBlink ? Math.max(0, 1 - Math.abs(phase - 3.6) / .12) : 0;
      values.blinkL = values.blinkR = Math.max(clamp(blink), automatic);
      values.lookLeft = clamp(-gaze); values.lookRight = clamp(gaze);
      mix(channels, 1);
      for (const { node, index, channel } of bindings) node.morphTargetInfluences[index] = clamp(values[channel] || 0);
    },
    reset,
    dispose: reset,
  };
}

// Explicit demonstration cues, not inferred lip sync or a claim of phonemes.
export function previewViseme(time) {
  const sequence = ['rest', 'MBP', 'AA', 'EE', 'rest', 'OH', 'AA', 'MBP'];
  return sequence[Math.floor(Math.max(0, time) * 3) % sequence.length];
}
