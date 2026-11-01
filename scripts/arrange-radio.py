"""Arrange AivisSpeech dialogue with original, locally synthesized radio music."""
from __future__ import annotations

import argparse
from array import array
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

RATE = 24000
ORDER = ["opening", "free", "letter", "music", "ending"]


def read_pcm(path: Path) -> array:
    with wave.open(str(path), "rb") as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, RATE):
            raise ValueError(f"24kHz mono PCM16が必要です: {path}")
        samples = array("h", source.readframes(source.getnframes()))
    if sys.byteorder != "little":
        samples.byteswap()
    return array("f", (x / 32768 for x in samples))


def write_pcm(path: Path, samples: array) -> None:
    peak = max((abs(x) for x in samples), default=0)
    gain = min(1.0, .97 / peak) if peak else 1.0
    pcm = array("h", (round(max(-1, min(1, x * gain)) * 32767) for x in samples))
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(path), "wb") as destination:
        destination.setnchannels(1)
        destination.setsampwidth(2)
        destination.setframerate(RATE)
        destination.writeframes(pcm.tobytes())


def music(seconds: float, level: float = .13, jingle: bool = False) -> array:
    """An original plucked-tone phrase; no recordings or external music assets."""
    samples = array("f", [0]) * round(seconds * RATE)
    melody = [60, 64, 67, 74] if jingle else [60, 64, 67, 69, 67, 64, 62, 64, 67, 72, 71, 69, 67, 64, 62, 60]
    beat = .48 if jingle else .6
    count = math.ceil(seconds / beat)
    for note in range(count):
        start = round(note * beat * RATE)
        frequency = 440 * 2 ** ((melody[note % len(melody)] + 12 - 69) / 12)
        length = min(round(.95 * RATE), len(samples) - start)
        for i in range(length):
            t = i / RATE
            envelope = min(1, t / .008) * math.exp(-5 * t)
            tone = math.sin(2 * math.pi * frequency * t) + .22 * math.sin(4 * math.pi * frequency * t)
            samples[start + i] += level * envelope * tone
    if not jingle:
        for i in range(len(samples)):
            t = i / RATE
            bass = [130.813, 110, 87.307, 97.999][int(t / 2.4) % 4]
            samples[i] += level * .22 * math.sin(2 * math.pi * bass * t)
    fade = min(.75, seconds / 3)
    for i in range(len(samples)):
        t = i / RATE
        samples[i] *= min(1, t / .03, max(0, (seconds - t) / fade))
    return samples


def mix_at(destination: array, source: array, start: int, gain: float = 1) -> None:
    for i in range(min(len(source), len(destination) - start)):
        destination[start + i] += source[i] * gain


def arrange(manifest: dict, directory: Path, target: float = 300) -> tuple[array, dict]:
    turns = manifest["turns"]
    seen = []
    for turn in turns:
        if not seen or seen[-1] != turn["section"]:
            seen.append(turn["section"])
    if seen != ORDER:
        raise ValueError("構成はopening/free/letter/music/endingの順にまとめてください。")
    sources = [read_pcm(directory / turn["file"]) for turn in turns]
    cues = {"opening": 3.0, "free": .8, "letter": 1.3, "music": .8, "ending": 1.1}
    base = sum(len(s) for s in sources) / RATE + sum(cues.values()) + 3.0
    bridge_seconds = max(12, min(35, target - base))
    output = array("f")
    chapters, utterances = [], []
    current = None
    music_played = False
    for index, (turn, source) in enumerate(zip(turns, sources)):
        if turn["section"] != current:
            current = turn["section"]
            chapters.append({"id": current, "startSeconds": len(output) / RATE})
            output.extend(music(cues[current], level=.1, jingle=True))
        utterances.append({"index": index, "speaker": turn["speaker"], "startSeconds": len(output) / RATE, "endSeconds": (len(output) + len(source)) / RATE})
        output.extend(source)
        if current == "music" and not music_played:
            chapters.append({"id": "original_track", "startSeconds": len(output) / RATE})
            output.extend(music(bridge_seconds))
            music_played = True
    ending_speech_end = len(output)
    output.extend(music(3, level=.09, jingle=True))
    starts = {chapter["id"]: chapter["startSeconds"] for chapter in chapters}
    # Music stays low and is limited to the opening and ending, below the voices.
    intro_start = round(utterances[0]["startSeconds"] * RATE)
    intro_end = round(starts["free"] * RATE)
    mix_at(output, music((intro_end - intro_start) / RATE, level=.018), intro_start)
    ending_start = round(starts["ending"] * RATE)
    mix_at(output, music((ending_speech_end - ending_start) / RATE, level=.018), ending_start)
    return output, {"chapters": chapters, "utterances": utterances, "bridgeSeconds": bridge_seconds, "durationSeconds": len(output) / RATE, "originalTrack": "角を曲がって"}


def timestamp(seconds: float) -> str:
    value = int(seconds)
    return f"{value // 60}:{value % 60:02}"


def main() -> None:
    parser = argparse.ArgumentParser(description="会話WAVをジングル・BGM・オリジナル曲と構成します。")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--target-seconds", type=float, default=300)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("既存の出力は上書きしません。別のパスを指定してください。")
    if not math.isfinite(args.target_seconds) or args.target_seconds <= 0:
        parser.error("target-secondsには正の秒数を指定してください。")
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    directory = args.manifest.resolve().parent
    samples, timeline = arrange(manifest, directory, args.target_seconds)
    mixed = directory / "program-mix.wav"
    write_pcm(mixed, samples)
    assets = directory / "assets"
    assets.mkdir(exist_ok=True)
    write_pcm(assets / "opening-jingle.wav", music(3, level=.1, jingle=True))
    write_pcm(assets / "角を曲がって.wav", music(timeline["bridgeSeconds"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n", "-i", str(mixed), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(RATE), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", str(args.output)], check=True)
    (directory / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    script = manifest["script"]
    sections = {section["id"]: section for section in script["sections"]}
    credit = f"構成参考：[筆先の世界]({script['formatReference']})。" if script.get("formatReference") else ""
    lines = [f"# {script['title']}", "", credit + "台詞・お便り・音楽はオリジナル。お便りは架空です。", "", "## 構成", ""]
    for chapter in timeline["chapters"]:
        label = "オリジナル曲『角を曲がって』" if chapter["id"] == "original_track" else sections[chapter["id"]]["label"]
        lines.append(f"- {timestamp(chapter['startSeconds'])} {label}")
    current = None
    for timing, turn in zip(timeline["utterances"], script["turns"]):
        if turn["section"] != current:
            current = turn["section"]
            section = sections[current]
            lines.extend(["", f"## {section['label']}", "", f"[{section['direction']}]", ""])
        if turn.get("direction"):
            lines.extend([f"[{turn['direction']}]", ""])
        label = manifest["voices"][turn["speaker"]]["name"]
        lines.extend([f"**{timestamp(timing['startSeconds'])} {label}**：{turn['text']}", ""])
    (directory / "script.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"番組尺: {timeline['durationSeconds']:.2f}秒 / 曲: {timeline['bridgeSeconds']:.2f}秒")


if __name__ == "__main__":
    main()
