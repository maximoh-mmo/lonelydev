---
id: "achi3"
title: "🔊 Prozedurales Audio ohne Assets: Synthese von 16-Bit-PCM-Holzakustik in reinem Code"
seoTitle: "Verfahrensorientierte Audiosynthese ohne Ressourcen: 16-Bit-PCM-Holzakustik in reinem Code"
date: "2026-12-18"
category: "Game Dev"
summary: "Synthetisiert beim Start alle Soundeffekte des Spiels prozedural in 44,1-kHz-16-Bit-PCM-AudioStreamWAV-Puffer unter Verwendung von Pitch-Drop-Hüllkurven, harmonischen Obertönen und hochfrequenten Klick-Transienten – wodurch dem Build 0 KB an Audio-Assets hinzugefügt werden."
project: "Achi"
tags: ["Godot 4", "Procedural Audio", "DSP", "PCM Synthesis", "GDScript", "Game Feel"]
status: "scheduled"
isAutoTranslated: true
---

## Einleitung

In einem minimalistischen, abstrakten Brettspiel wie **Achi** sorgt die haptische akustische Rückmeldung für die Hälfte der physischen Illusion. Wenn man eine Spielfigur auf eine Kreuzung fallen lässt oder sie entlang einer eingearbeiteten Rille schiebt, sollte es sich anhören, als würden warmes Holz oder Keramik auf ein Brett treffen – und nicht wie ein Laser in einem Spielhallenspiel oder eine leere Webseite.

Normalerweise würde man ein Verzeichnis mit `.wav`- oder `.ogg`-Samples importieren. Stattdessen habe ich **`SoundManager`** in reinem GDScript entwickelt, um **jeden Soundeffekt beim Start mathematisch in `44.100 Hz` 16-Bit-PCM-`AudioStreamWAV`-Puffer zu synthetisieren**:

1. **Keine überflüssigen Daten (`0 KB`):** Die gesamte Audio-Engine fügt WebGL2- oder mobilen Downloads keine externen Binär-Samples hinzu.
2. **Akustische Konsistenz:** Genauso wie unser Spielfeld prozedural aus vier semantischen Farben gerendert wird, erzeugt unser Audio jedes Signal aus Grundsinusoszillatoren, harmonischen Obertönen und exponentiellen Hüllkurven.
3. **Eindeutige akustische Silhouetten:** Da die Frequenzen programmgesteuert berechnet werden, erzeugen die Kreis-Spielsteine (`●`) von Spieler 1 einen etwas helleren, holzigen Klopfton (`270 Hz → 175 Hz`), während die abgerundeten quadratischen Spielsteine (`■`) einen tieferen, schwereren Klopfton (`225 Hz → 145 Hz`) – so können die Spieler die Spielzüge allein am Klang unterscheiden.

---

## 1. Anatomie eines physischen hölzernen Token-Klopfs

Eine Sinuswelle mit konstanter Frequenz klingt unverkennbar synthetisch. Um einen Oszillator wie ein physisches Holztoken lesen zu lassen, das auf ein geschnitztes Brett schlägt, legt '_synth_knock()' zwei akustische Zutaten über ~85ms:

* **Ein schneller resonanter Tonhöhenfall** über die ersten ~35 ms ('lerpf(f_start, f_end, minf(1,0, norm_t * 2,4))'), der eine massive Holzhöhle nachahmt, die sich nach dem Aufprall absetzt. 
* **Ein Dual-Envelope-Mix:** Ein scharfer hochfrequenter Klick-Transient ("exp(-norm_t * 24.0)") geschichtet über einem warmen Grundton + 2. Obertonkörper ("sin(phase_body) + 0,30 * sin(phase_body * 2.0)', der bei "exp(-norm_t * 6.8)" abklingt).

! [16-Bit-PCM-prozedurale Klopfsynthesehüllung und akustische Silhouetten] (/images/achi/achi-pcm-synthesis.svg)

Bei '_ready()' prebakt 'SoundManager' 8 'AudioStreamWAV'-Ressourcen in den Speicher, indem signierte 16-Bit-Little-Endian-Samples in ein 'PackedByteArray' gepackt werden:

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

## 2. Zweistufige Folien & Deutliche Siegesrhythmen

Über die Platzierung von Tokens hinaus synthetisiert 'SoundManager' Bewegungs- und Ergebnis-Signale, die auf Achis zwei Siegbedingungen zugeschnitten sind:

* **Two-Stage Slide & Intersection Snap ('_synth_slide_and_snap'):** Das Schieben eines Tokens löst eine '0,145s'-zusammengesetzte Wellenform aus – die erste '54%' ('0,00s–0,078s') erzeugt einen steigenden Sweep ('165 Hz → 265 Hz') unter einer Halbsinus-Hüllkurve ("sin(g_norm * PI)'), synchronisiert mit unserem kubischen Slide-Tween, gefolgt von einem klaren perkussiven Snap ('340 Hz → 215 Hz') in dem Moment, in dem das Stück seinen Zielknoten einbindet. 
* **3-in-a-Row Victory ('play_victory_line'):** Ein aufmunterndes Dur-pentatonisches Arpeggio ('C5 → E5 → G5 + C6'), synthetisiert über '_synth_multi_note_sequence()'. 
* **4-Token Encirclement Victory ('play_victory_trap'):** Eine synkopierte, rhythmische "Double-Lock"-Kadenz ('D5 → A5 → F#5 + D6'), die die Besiegelung des letzten legalen Zugs deines Gegners belohnt. 
* **Dreifaches Wiederholungsunentschieden ('play_draw'):** Eine ruhige, ausgesetzte 'A4 → G4'-Auflösung.

Jeder taktile Hinweis passt zu leichter mobiler Vibration ("Input.vibrate_handheld()') bei Touch-Geräten und respektiert einen sofortigen globalen Stummschalter.

---

## 3. Choreografie des 1,6-sekündigen animierten Vektor-Stiefel-Splash

Schließlich tun sich 'SoundManager' und unser prozeduraler 4-Farben-Renderer ('AchiEmblemView') beim Start in einer choreografierten 1,6-Sekunden-Vektor-Splash-Sequenz zusammen ('_play_boot_splash()'):

1. **'0,00s → 0,55s' (Progressive Graph Draw):** Alle 16 Board-Segmente des 3×3 Achi Graphs zeichnen sich über die aktive Farbpalette. 
2. **'0,55s → 0,80s' (Square Token Pop):** Abgerundete quadratische Tokens ('■') springen auf die Knoten '[1, 3, 6]' mit einer 'TRANS_BACK'-Federleichtigkeit, synchronisiert mit dem tieferen '225 Hz → 145 Hz' hölzernen Klopfen. 
3. **'0,80s → 1,15s' (Kreisdiagonale & Siegesbalken):** Kreismarken ('●') schnappen entlang der Hauptdiagonale '[0, 4, 8]' mit dem helleren '270 Hz → 175 Hz'-Klopfen, während ein diagonaler Siegstrahl über das Emblem wegt.

Null Splash-PNGs, keine gebündelten ".wav"-Samples und sofortige Palettenanpassung schon im allerersten Bild.

---

## Mit Blick nach vorne: C++17 Prozedurale Systeme mit 'Ivy Sim'

Mit **Onsets Pivot**, **JTS3D**, dem **maxheinze.com**-Redesign und diesen drei ingenieurwissenschaftlichen Tiefgängen von **Achi**, die bis Mitte Dezember geplant sind, wendet sich unser nächstes Kapitel der **Ivy Sim** zu – einer öffentlichen **C++17 Godot 4 GDExtension** ('godot-cpp'), die deterministische 'PCG32'-Simulation, planare 3D-Geometrieprojektionen, bilineare Oberflächenattraktionskartierung und prozedurales 3D-Efeuwachstum erforscht.
