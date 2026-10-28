/** Per-deck Web Audio graph: trim → 3-band EQ → filter → (echo, reverb) → channel level → crossfader. */

export function setParam(ctx, param, value, ramp = 0.015) {
  if (!ctx) return;
  param.cancelScheduledValues(ctx.currentTime);
  param.setTargetAtTime(value, ctx.currentTime, ramp);
}

/** Deterministic exponentially decaying noise impulse for the reverb. */
export function makeImpulse(ctx, seconds = 1.3) {
  const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  let seed = 1977;
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let j = 0; j < data.length; j++) {
      seed = (seed * 16807) % 2147483647;
      data[j] = (seed / 1073741824 - 1) * Math.pow(1 - j / data.length, 2.8) * 0.28;
    }
  }
  return buffer;
}

export function createChannel(ctx, masterNode, deck) {
  const input = ctx.createGain();
  const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 250;
  const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8;
  const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4000;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 24000; filter.Q.value = 0.7;
  const channel = ctx.createGain(), mix = ctx.createGain();
  const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
  const outputAnalyser = ctx.createAnalyser(); outputAnalyser.fftSize = 512;
  input.connect(low); low.connect(mid); mid.connect(high); high.connect(filter); filter.connect(channel);
  channel.connect(analyser); analyser.connect(mix); mix.connect(outputAnalyser); outputAnalyser.connect(masterNode);

  const delay = ctx.createDelay(8), feedback = ctx.createGain(), echo = ctx.createGain();
  delay.delayTime.value = 0.375; feedback.gain.value = 0.32; echo.gain.value = 0;
  filter.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(echo); echo.connect(channel);

  const reverb = ctx.createConvolver(), wet = ctx.createGain(); wet.gain.value = 0;
  reverb.buffer = makeImpulse(ctx);
  filter.connect(reverb); reverb.connect(wet); wet.connect(channel);

  const nodes = {input, low, mid, high, filter, channel, mix, analyser, outputAnalyser, delay, feedback, echo, reverb, wet};
  input.gain.value = deck.trim;
  channel.gain.value = deck.gain;
  for (const band of ['low', 'mid', 'high']) nodes[band].gain.value = deck.eqKills[band] ? -90 : deck.eq[band];
  return nodes;
}

/** Push filter/echo/reverb state into the graph; bypass silences the sends but keeps values. */
export function applyChannelFX(ctx, deck) {
  const nodes = deck.nodes;
  if (!nodes) return;
  const value = deck.fxBypass ? 0 : deck.filter;
  nodes.filter.type = value > 0 ? 'highpass' : 'lowpass';
  const frequency = value > 0 ? 20 * Math.pow(1000, value) : Math.min(ctx.sampleRate / 2, 20000) * Math.pow(0.002, -value);
  setParam(ctx, nodes.filter.frequency, frequency);
  setParam(ctx, nodes.echo.gain, deck.fxBypass ? 0 : deck.fx.echo * 0.65);
  setParam(ctx, nodes.wet.gain, deck.fxBypass ? 0 : deck.fx.reverb * 0.65);
  setParam(ctx, nodes.delay.delayTime, Math.min(8, deck.bpm ? 60 / deck.bpm * deck.echoBeats : 0.375));
  setParam(ctx, nodes.feedback.gain, deck.echoFeedback);
}

/** RMS level 0..1 from an analyser. */
export function rmsLevel(analyser) {
  if (!analyser) return 0;
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let power = 0;
  for (const v of data) power += v * v;
  return Math.sqrt(power / data.length);
}
