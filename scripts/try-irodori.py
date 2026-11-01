"""Local listening experiment using the official Irodori inference runtime."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time


def main() -> None:
    parser = argparse.ArgumentParser(description="Irodori-TTSで二人の会話を試作します。")
    parser.add_argument("script", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2] / "irodori-tts")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", choices=["mps", "cpu"], default="mps")
    parser.add_argument("--codec-device", choices=["mps", "cpu"], default="mps")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.suffix.lower() != ".mp3" or output.exists():
        parser.error("出力にはまだ存在しない.mp3のパスを指定してください。")
    if not shutil.which("ffmpeg"):
        parser.error("ffmpegが必要です。")
    script = json.loads(args.script.read_text(encoding="utf-8"))
    voices, turns = script["voices"], script["turns"]
    if len(voices) != 2 or {t["speaker"] for t in turns} != set(voices):
        parser.error("2人のvoicesと、両方の話者を含むturnsを指定してください。")
    if any(not t["text"].strip() or len(t["text"]) > 2000 for t in turns):
        parser.error("各台詞は1〜2000文字にしてください。")
    if any(not 0 <= t.get("pauseMs", 180) <= 5000 for t in turns):
        parser.error("pauseMsは0〜5000にしてください。")
    if any(not v["caption"].strip() for v in voices.values()):
        parser.error("各話者に声の説明captionが必要です。")

    sys.path.insert(0, str(args.root.resolve()))
    import torch
    from irodori_tts.inference_runtime import (
        InferenceRuntime, RuntimeKey, SamplingRequest, download_hf_checkpoint, save_wav,
    )

    if "mps" in (args.device, args.codec_device) and not torch.backends.mps.is_available():
        raise RuntimeError("MPSを利用できません。CPUで試す場合は両deviceにcpuを明示してください。")
    started = time.perf_counter()
    model = "Aratako/Irodori-TTS-v4.1-Small-MF"
    checkpoint = download_hf_checkpoint(model)
    runtime = InferenceRuntime.from_key(RuntimeKey(
        checkpoint=checkpoint, model_device=args.device, codec_device=args.codec_device,
    ))
    output.parent.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="irodori-", dir=output.parent))
    references: dict[str, str] = {}
    records, parts = [], []
    print(f"work: {work}", flush=True)
    for index, turn in enumerate(turns):
        speaker = turn["speaker"]
        voice = voices[speaker]
        turn_started = time.perf_counter()
        result = runtime.synthesize(SamplingRequest(
            text=turn["text"], caption=voice["caption"],
            no_ref=speaker not in references, ref_wav=references.get(speaker),
            seed=int(voice["seed"]) + index, num_steps=4,
        ), log_fn=print)
        raw = work / f"raw-{index:02d}.wav"
        save_wav(raw, result.audio, result.sample_rate)
        # Each voice's first, newly designed utterance anchors later turns.
        references.setdefault(speaker, str(raw))
        part = work / f"part-{index:02d}.wav"
        gap = turn.get("pauseMs", 0 if index == len(turns) - 1 else 180) / 1000
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n",
            "-i", str(raw), "-af", f"atempo=0.95,apad=pad_dur={gap}",
            "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(part),
        ], check=True)
        parts.append(f"file '{part.name}'")
        records.append({
            "speaker": speaker, "text": turn["text"], "seed": result.used_seed,
            "generationSeconds": time.perf_counter() - turn_started,
            "audioSecondsBeforeTempo": result.audio.numel() / result.sample_rate,
            "reference": references[speaker], "messages": result.messages,
        })
        print(f"{index + 1}/{len(turns)} {voice['label']}", flush=True)
    concat = work / "parts.txt"
    concat.write_text("\n".join(parts) + "\n", encoding="utf-8")
    encoded = work / "conversation.mp3"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-n",
        "-f", "concat", "-safe", "1", "-i", str(concat),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1",
        "-c:a", "libmp3lame", "-b:a", "96k", str(encoded),
    ], check=True)
    # Exclusive create keeps a concurrent or previous result intact.
    with output.open("xb") as destination, encoded.open("rb") as source:
        shutil.copyfileobj(source, destination)
    manifest = {
        "model": model, "checkpoint": checkpoint, "device": args.device,
        "codecDevice": args.codec_device, "precision": "fp32", "steps": 4,
        "tempoAfterSynthesis": 0.95, "script": script,
        "elapsedSeconds": time.perf_counter() - started, "turns": records,
    }
    (work / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"MP3: {output}\n記録と各台詞: {work}", flush=True)


if __name__ == "__main__":
    main()
