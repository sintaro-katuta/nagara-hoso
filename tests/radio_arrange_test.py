import importlib.util
from pathlib import Path
import tempfile
import unittest
from array import array

spec = importlib.util.spec_from_file_location("arrange_radio", Path(__file__).resolve().parents[1] / "scripts/arrange-radio.py")
radio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(radio)


class ArrangementTest(unittest.TestCase):
    def test_sections_keep_order_and_music_follows_its_introduction(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            radio.write_pcm(root / "voice.wav", array("f", [.1]) * (radio.RATE // 10))
            turns = [{"file":"voice.wav", "speaker":"shigeru", "section":section} for section in radio.ORDER]
            audio, timeline = radio.arrange({"turns":turns}, root, target=24)
            self.assertAlmostEqual(len(audio) / radio.RATE, timeline["durationSeconds"])
            self.assertAlmostEqual(timeline["durationSeconds"], 24, places=3)
            chapters = timeline["chapters"]
            self.assertEqual([c["id"] for c in chapters], ["opening","free","letter","music","original_track","ending"])
            self.assertEqual(chapters, sorted(chapters, key=lambda c:c["startSeconds"]))
            intro = timeline["utterances"][3]
            self.assertAlmostEqual(chapters[4]["startSeconds"], intro["endSeconds"])
            self.assertGreater(sum(abs(x) for x in audio), 0)

    def test_incomplete_or_repeated_sections_fail_before_files_are_loaded(self):
        for ids in [["opening","ending"], ["opening","free","opening","letter","music","ending"]]:
            with self.assertRaisesRegex(ValueError,"構成"):
                radio.arrange({"turns":[{"section":section} for section in ids]}, Path("missing"))


if __name__ == "__main__":
    unittest.main()
