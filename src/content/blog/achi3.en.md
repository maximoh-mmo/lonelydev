---
id: achi3
title: "🔊 Zero-Asset Procedural Audio: Synthesizing 16-Bit PCM Wooden Acoustics in Pure Code"
seoTitle: "Zero Asset Procedural Audio Synthesizing 16 Bit PCM Wooden Acoustics in Pure Code"
date: "2026-12-18"
category: "Game Dev"
summary: "Synthesizes all game sound effects procedurally into 44.1 kHz 16-bit PCM AudioStreamWAV buffers at startup using pitch-drop envelopes, harmonic overtones, and high-frequency click transients—adding 0 KB of audio assets to the build."
project: "Achi"
tags: ["Godot 4", "Procedural Audio", "DSP", "PCM Synthesis", "GDScript", "Game Feel"]
status: "scheduled"
isAutoTranslated: false
---

## Introduction

In a minimalist abstract board game like **Achi**, tactile audio feedback supplies half of the physical illusion. Dropping a piece onto an intersection or sliding it along a carved groove should sound like warm wood or ceramic striking a board—not an arcade laser or an empty web page.

Normally, you would import a directory of `.wav` or `.ogg` samples. Instead, I built **`SoundManager`** in pure GDScript to **synthesize every sound effect mathematically into `44,100 Hz` 16-bit PCM `AudioStreamWAV` buffers at startup**:

1. **Zero Asset Bloat (`0 KB`):** The entire audio engine adds zero bytes of external binary samples to WebGL2 or mobile downloads.
2. **Acoustic Consistency:** Just as our board renders procedurally from 4 semantic colors, our audio generates every cue from fundamental sine oscillators, harmonic overtones, and exponential envelopes.
3. **Distinct Acoustic Silhouettes:** Because frequencies are computed in code, Player 1's Circle tokens (`●`) emit a slightly brighter wooden knock (`270 Hz → 175 Hz`), while Player 2's Rounded Square tokens (`■`) emit a deeper, weightier knock (`225 Hz → 145 Hz`)—letting players distinguish turns by ear alone.

---

## 1. Anatomy of a Physical Wooden Token Knock

A constant-frequency sine wave sounds unmistakably synthetic. To make an oscillator read as a physical wooden token hitting a carved board, `_synth_knock()` layers two acoustic ingredients over ~85ms:

* **A fast resonant pitch drop** over the first ~35ms (`lerpf(f_start, f_end, minf(1.0, norm_t * 2.4))`), mimicking a solid wooden cavity settling after impact.
* **A dual-envelope mix:** A sharp high-frequency click transient (`exp(-norm_t * 24.0)`) layered over a warm fundamental + 2nd harmonic body (`sin(phase_body) + 0.30 * sin(phase_body * 2.0)` decaying at `exp(-norm_t * 6.8)`).

![16-Bit PCM Procedural Knock Synthesis Envelope and Acoustic Silhouettes](/images/achi/achi-pcm-synthesis.svg)

At `_ready()`, `SoundManager` pre-bakes 8 `AudioStreamWAV` resources into memory by packing signed 16-bit little-endian samples into a `PackedByteArray`:

```gdscript
func _synth_knock(f_start: float, f_end: float, f_transient: float, duration: float) -> AudioStreamWAV:
	var sample_count: int = int(float(MIX_RATE) * duration)
	var pcm := PackedByteArray()
	pcm.resize(sample_count * 2)

	var phase_body: float = 0.0
	var phase_trans: float = 0.0
	var inv_rate: float = 1.0 / float(MIX_RATE)

	for i in range(sample_count):
		var t: float = float(i) * inv_rate
		var norm_t: float = t / maxf(0.001, duration)

		# Fast attack (2ms) + exponential decay
		var attack: float = minf(1.0, t / 0.002)
		var body_env: float = attack * exp(-norm_t * 6.8)
		var trans_env: float = attack * exp(-norm_t * 24.0)

		var cur_freq: float = lerpf(f_start, f_end, minf(1.0, norm_t * 2.4))
		phase_body += TAU * cur_freq * inv_rate
		phase_trans += TAU * f_transient * inv_rate

		var body_sig: float = sin(phase_body) + 0.30 * sin(phase_body * 2.0)
		var trans_sig: float = sin(phase_trans) * 0.42
		var sample_f: float = (body_sig * body_env + trans_sig * trans_env) * 0.68

		_write_pcm16_sample(pcm, i, sample_f)

	return _build_wav_from_pcm(pcm)
```

---

## 2. Two-Stage Slides & Distinct Victory Cadences

Beyond token placement knocks, `SoundManager` synthesizes motion and outcome cues tailored to Achi's two win conditions:

* **Two-Stage Slide & Intersection Snap (`_synth_slide_and_snap`):** Sliding a token triggers a `0.145s` composite waveform—the first `54%` (`0.00s–0.078s`) generates a rising sweep (`165 Hz → 265 Hz`) under a half-sine envelope (`sin(g_norm * PI)`) synchronized to our cubic slide tween, followed by a crisp percussive snap (`340 Hz → 215 Hz`) the instant the piece locks into its destination node.
* **3-in-a-Row Victory (`play_victory_line`):** An uplifting major pentatonic arpeggio (`C5 → E5 → G5 + C6`) synthesized via `_synth_multi_note_sequence()`.
* **4-Token Encirclement Victory (`play_victory_trap`):** A syncopated, rhythmic "double-lock" cadence (`D5 → A5 → F#5 + D6`) that rewards sealing your opponent's final legal move.
* **Threefold Repetition Draw (`play_draw`):** A calm, suspended `A4 → G4` resolution.

Each tactile cue pairs with light mobile vibration (`Input.vibrate_handheld()`) on touch devices and respects an instant global mute switch.

---

## 3. Choreographing the 1.6-Second Animated Vector Boot Splash

Finally, `SoundManager` and our procedural 4-color renderer (`AchiEmblemView`) join forces in a choreographed 1.6-second vector splash sequence at startup (`_play_boot_splash()`):

1. **`0.00s → 0.55s` (Progressive Graph Draw):** All 16 board segments of the 3×3 Achi graph draw across the active color palette.
2. **`0.55s → 0.80s` (Square Token Pop):** Rounded Square tokens (`■`) pop onto nodes `[1, 3, 6]` with a `TRANS_BACK` spring ease synced to the deeper `225 Hz → 145 Hz` wooden knock.
3. **`0.80s → 1.15s` (Circle Diagonal & Victory Beam):** Circle tokens (`●`) snap along the `[0, 4, 8]` main diagonal with the brighter `270 Hz → 175 Hz` knock as a diagonal victory beam sweeps across the emblem.

Zero splash PNGs, zero bundled `.wav` samples, and instant palette adaptation on the very first frame.

---

## Looking Ahead: C++17 Procedural Systems with `Ivy Sim`

With **Onset's pivot**, **JTS3D**, the **maxheinze.com** redesign, and these three engineering deep dives from **Achi** scheduled through mid-December, our next chapter turns to **Ivy Sim**—a public **C++17 Godot 4 GDExtension** (`godot-cpp`) exploring deterministic `PCG32` simulation, planar 3D geometry projections, bilinear surface attraction mapping, and procedural 3D ivy growth.
